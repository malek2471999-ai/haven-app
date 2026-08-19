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

    // Check if group is anonymous
    const groupInfo = await query(`SELECT is_anonymous FROM groups WHERE id = $1`, [params.id])
    const isAnonymous = groupInfo.rows[0]?.is_anonymous || false

    // Check if current user is owner (owner can see usernames)
    let isOwner = false
    if (isAnonymous) {
      const ownerCheck = await query(
        `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
        [params.id, payload.userId]
      )
      isOwner = ownerCheck.rows.length > 0 && ownerCheck.rows[0].role === 'owner'
    }

    const since = request.nextUrl.searchParams.get('since')

    let msgs
    if (since) {
      msgs = await query(
        `SELECT gm.*, u.display_name, u.avatar_url, u.username,
                rm.content as reply_content, ru.display_name as reply_user_name
         FROM group_messages gm
         JOIN users u ON u.id = gm.user_id
         LEFT JOIN group_messages rm ON rm.id = gm.reply_to_id
         LEFT JOIN users ru ON ru.id = rm.user_id
         WHERE gm.group_id = $1 AND gm.created_at > $2
         ORDER BY gm.created_at ASC LIMIT 100`,
        [params.id, since]
      )
    } else {
      msgs = await query(
        `SELECT gm.*, u.display_name, u.avatar_url, u.username,
                rm.content as reply_content, ru.display_name as reply_user_name
         FROM group_messages gm
         JOIN users u ON u.id = gm.user_id
         LEFT JOIN group_messages rm ON rm.id = gm.reply_to_id
         LEFT JOIN users ru ON ru.id = rm.user_id
         WHERE gm.group_id = $1 AND (gm.is_deleted = FALSE OR gm.user_id = $2)
         ORDER BY gm.created_at ASC LIMIT 200`,
        [params.id, payload.userId]
      )
    }

    // If anonymous group and user is NOT owner, anonymize sender info
    if (isAnonymous && !isOwner) {
      msgs.rows = msgs.rows.map((m: any) => ({
        ...m,
        display_name: 'عضو مجهول',
        avatar_url: null,
        username: 'anonymous',
        reply_user_name: m.reply_to_id ? 'عضو مجهول' : m.reply_user_name,
      }))
    }

    // Get reactions
    const messageIds = msgs.rows.map((m: any) => m.id)
    let reactionsMap: Record<string, any[]> = {}
    if (messageIds.length > 0) {
      const reactions = await query(
        `SELECT gr.*, u.display_name, u.username
         FROM group_reactions gr JOIN users u ON u.id = gr.user_id
         WHERE gr.message_id = ANY($1)`,
        [messageIds]
      )
      for (const r of reactions.rows) {
        if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = []
        reactionsMap[r.message_id].push(r)
      }
    }

    const messagesWithReactions = msgs.rows.map((m: any) => ({
      ...m,
      reactions: reactionsMap[m.id] || [],
    }))

    return NextResponse.json({ messages: messagesWithReactions })
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
    const { content, type = 'text', fileUrl, fileName, fileSize, fileType, replyToId } = body

    // Check if user can write
    const memberCheck = await query(
      `SELECT can_write, role FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [params.id, payload.userId]
    )
    const memberInfo = memberCheck.rows[0]
    if (memberInfo && !memberInfo.can_write && memberInfo.role !== 'owner') {
      return NextResponse.json({ error: 'ليس لديك صلاحية الكتابة — أنت مشاهد فقط' }, { status: 403 })
    }

    if (!content?.trim() && !fileUrl) {
      return NextResponse.json({ error: 'الرسالة فارغة' }, { status: 400 })
    }

    let finalContent = content?.trim() || ''
    if (fileUrl) {
      finalContent = JSON.stringify({ url: fileUrl, name: fileName, size: fileSize, fileType })
    }

    let insertQuery = `INSERT INTO group_messages (group_id, user_id, content, type`
    let insertValues: any[] = [params.id, payload.userId, finalContent, type]
    let paramIndex = 5

    if (replyToId) {
      insertQuery += `, reply_to_id`
      insertValues.push(replyToId)
      insertQuery += `) VALUES ($1, $2, $3, $4, $${paramIndex})`
      paramIndex++
    } else {
      insertQuery += `) VALUES ($1, $2, $3, $4)`
    }

    insertQuery += ` RETURNING *`

    const result = await query(insertQuery, insertValues)

    const msgWithUser = await query(
      `SELECT gm.*, u.display_name, u.avatar_url, u.username,
              rm.content as reply_content, ru.display_name as reply_user_name
       FROM group_messages gm
       JOIN users u ON u.id = gm.user_id
       LEFT JOIN group_messages rm ON rm.id = gm.reply_to_id
       LEFT JOIN users ru ON ru.id = rm.user_id
       WHERE gm.id = $1`,
      [result.rows[0].id]
    )

    let finalMsg = { ...msgWithUser.rows[0], reactions: [] }

    const groupCheck = await query(
      `SELECT is_anonymous FROM conversations WHERE id = $1`,
      [params.id]
    )
    const isAnonymous = groupCheck.rows[0]?.is_anonymous
    const isOwner = memberInfo?.role === 'owner'

    if (isAnonymous && !isOwner) {
      finalMsg = {
        ...finalMsg,
        display_name: 'عضو مجهول',
        avatar_url: null,
        username: 'anonymous',
      }
    }

    return NextResponse.json({ message: finalMsg })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ: ' + error.message }, { status: 500 })
  }
}
