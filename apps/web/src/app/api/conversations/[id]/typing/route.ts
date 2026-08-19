import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

// GET: Check typing status + unread count
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const conversationId = params.id

    // Get typing users (typed in last 5 seconds)
    const typingUsers = await query(
      `SELECT u.id, u.display_name, u.username
       FROM conversation_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.conversation_id = $1
         AND cm.user_id != $2
         AND cm.last_typed_at > NOW() - INTERVAL '5 seconds'`,
      [conversationId, payload.userId]
    )

    // Get unread count
    const unread = await query(
      `SELECT COUNT(*) as count FROM messages
       WHERE conversation_id = $1 AND user_id != $2
         AND created_at > (SELECT last_read_at FROM conversation_members WHERE conversation_id = $1 AND user_id = $2)`,
      [conversationId, payload.userId]
    )

    return NextResponse.json({
      typing: typingUsers.rows,
      unreadCount: parseInt(unread.rows[0]?.count || '0'),
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// POST: Update typing status or mark as read
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const { action } = await request.json()
    const conversationId = params.id

    if (action === 'typing') {
      await query(
        `UPDATE conversation_members SET last_typed_at = NOW() WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, payload.userId]
      )
      return NextResponse.json({ ok: true })
    }

    if (action === 'read') {
      await query(
        `UPDATE conversation_members SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, payload.userId]
      )

      // Mark messages as read
      await query(
        `INSERT INTO message_receipts (message_id, user_id, status, created_at)
         SELECT m.id, $2, 'read', NOW()
         FROM messages m
         WHERE m.conversation_id = $1 AND m.user_id != $2
           AND NOT EXISTS (
             SELECT 1 FROM message_receipts mr
             WHERE mr.message_id = m.id AND mr.user_id = $2
           )`,
        [conversationId, payload.userId]
      )

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
