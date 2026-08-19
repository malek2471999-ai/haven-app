import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const since = request.nextUrl.searchParams.get('since')

    let msgs
    if (since) {
      // Polling: get messages since timestamp
      msgs = await query(
        `SELECT m.*, u.display_name, u.avatar_url, u.username
         FROM messages m JOIN users u ON u.id = m.user_id
         WHERE m.conversation_id = $1 AND m.created_at > $2
         ORDER BY m.created_at ASC LIMIT 100`,
        [params.id, since]
      )
    } else {
      // Initial load: get last 200 messages + reply_to data
      msgs = await query(
        `SELECT m.*, u.display_name, u.avatar_url, u.username,
                rm.content as reply_content, ru.display_name as reply_user_name
         FROM messages m
         JOIN users u ON u.id = m.user_id
         LEFT JOIN messages rm ON rm.id = m.reply_to_id
         LEFT JOIN users ru ON ru.id = rm.user_id
         WHERE m.conversation_id = $1
           AND (m.expires_at IS NULL OR m.expires_at > NOW())
         ORDER BY m.created_at ASC LIMIT 200`,
        [params.id]
      )
    }

    // Get reactions for each message
    const messageIds = msgs.rows.map((m: any) => m.id)
    let reactionsMap: Record<string, any[]> = {}
    let receiptsMap: Record<string, any> = {}

    if (messageIds.length > 0) {
      const reactions = await query(
        `SELECT mr.*, u.display_name, u.username
         FROM message_reactions mr
         JOIN users u ON u.id = mr.user_id
         WHERE mr.message_id = ANY($1)`,
        [messageIds]
      )
      for (const r of reactions.rows) {
        if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = []
        reactionsMap[r.message_id].push(r)
      }

      // Get receipt status for messages sent by the current user
      const ownMessageIds = msgs.rows
        .filter((m: any) => m.user_id === payload.userId)
        .map((m: any) => m.id)

      if (ownMessageIds.length > 0) {
        const receipts = await query(
          `SELECT DISTINCT ON (message_id) message_id, status
           FROM message_receipts
           WHERE message_id = ANY($1)
           ORDER BY message_id, updated_at DESC`,
          [ownMessageIds]
        )
        for (const r of receipts.rows) {
          receiptsMap[r.message_id] = r.status
        }
      }
    }

    const messagesWithExtras = msgs.rows.map((m: any) => ({
      ...m,
      reactions: reactionsMap[m.id] || [],
      receiptStatus: m.user_id === payload.userId ? (receiptsMap[m.id] || 'sent') : undefined,
    }))

    return NextResponse.json({ messages: messagesWithExtras })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const body = await request.json()
    const { content, type = 'text', fileUrl, fileName, fileSize, fileType, replyToId, forwardFrom, expiresIn } = body

    if (type !== 'text' && type !== 'voice' && type !== 'file' && !content?.trim()) {
      return NextResponse.json({ error: 'الرسالة فارغة' }, { status: 400 })
    }

    let finalContent = content?.trim() || ''
    if (fileUrl) {
      finalContent = JSON.stringify({ url: fileUrl, name: fileName, size: fileSize, fileType })
    }

    // Build query
    let insertQuery = `INSERT INTO messages (conversation_id, user_id, content, type`
    let insertValues = [params.id, payload.userId, finalContent, type]
    let paramIndex = 5

    if (replyToId) {
      insertQuery += `, reply_to_id`
      insertValues.push(replyToId)
      insertQuery += `) VALUES ($1, $2, $3, $4, $${paramIndex})`
      paramIndex++
    } else {
      insertQuery += `) VALUES ($1, $2, $3, $4)`
    }

    // Forwarded message
    if (forwardFrom) {
      insertQuery = insertQuery.replace('INSERT INTO messages', 'INSERT INTO messages')
      // Add forwarded column
      if (paramIndex === 5) {
        insertValues.push(true)
        insertQuery += `, forwarded) VALUES ($1, $2, $3, $4, $${paramIndex})`
        // Actually, let's simplify - just mark as forwarded
      }
    }

    // Disappearing message
    if (expiresIn) {
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
      insertValues.push(expiresAt)
      if (!insertQuery.includes('expires_at')) {
        insertQuery += `, expires_at) VALUES ($1, $2, $3, $4` + (replyToId ? `, $5` : '') + `, $${paramIndex})`
      }
    }

    insertQuery += ` RETURNING *`

    const result = await query(insertQuery, insertValues)

    await query(
      `UPDATE conversations SET last_message_at = NOW() WHERE id = $1`,
      [params.id]
    )

    // Fetch with user data and reply data
    const msgWithUser = await query(
      `SELECT m.*, u.display_name, u.avatar_url, u.username,
              rm.content as reply_content, ru.display_name as reply_user_name
       FROM messages m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN messages rm ON rm.id = m.reply_to_id
       LEFT JOIN users ru ON ru.id = rm.user_id
       WHERE m.id = $1`,
      [result.rows[0].id]
    )

    return NextResponse.json({ message: { ...msgWithUser.rows[0], reactions: [], receiptStatus: 'sent' } })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ: ' + error.message }, { status: 500 })
  }
}
