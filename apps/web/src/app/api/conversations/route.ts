import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const memberships = await query(
      `SELECT conversation_id, last_read_at, is_muted FROM conversation_members WHERE user_id = $1`,
      [payload.userId]
    )

    if (memberships.rows.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    const convIds = memberships.rows.map((m: any) => m.conversation_id)

    const convs = await query(
      `SELECT * FROM conversations WHERE id = ANY($1) ORDER BY last_message_at DESC NULLS LAST`,
      [convIds]
    )

    const enriched = await Promise.all(
      convs.rows.map(async (conv: any) => {
        const members = await query(
          `SELECT cm.user_id, cm.role, cm.is_muted, u.display_name, u.avatar_url, u.username, u.is_verified
           FROM conversation_members cm JOIN users u ON u.id = cm.user_id
           WHERE cm.conversation_id = $1`,
          [conv.id]
        )

        const otherMember = members.rows.find((m: any) => m.user_id !== payload.userId)

        let lastMsg = null
        try {
          const lm = await query(
            `SELECT m.*, u.display_name, u.avatar_url FROM messages m JOIN users u ON u.id = m.user_id
             WHERE m.conversation_id = $1 ORDER BY m.created_at DESC LIMIT 1`,
            [conv.id]
          )
          lastMsg = lm.rows[0] || null
        } catch {}

        const membership = memberships.rows.find((m: any) => m.conversation_id === conv.id)

        return {
          ...conv,
          last_message: lastMsg,
          other_user: otherMember ? {
            id: otherMember.user_id,
            display_name: otherMember.display_name,
            avatar_url: otherMember.avatar_url,
            username: otherMember.username,
            is_verified: otherMember.is_verified,
          } : null,
          my_membership: membership,
        }
      })
    )

    return NextResponse.json({ conversations: enriched })
  } catch (error: any) {
    console.error('Conversations error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const { userId: targetUserId } = await request.json()
    if (!targetUserId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 })
    }

    // Check if conversation already exists between these two users
    const existing = await query(
      `SELECT cm1.conversation_id FROM conversation_members cm1
       JOIN conversation_members cm2 ON cm2.conversation_id = cm1.conversation_id
       JOIN conversations c ON c.id = cm1.conversation_id
       WHERE cm1.user_id = $1 AND cm2.user_id = $2 AND c.type = 'direct'`,
      [payload.userId, targetUserId]
    )

    if (existing.rows.length > 0) {
      return NextResponse.json({ conversationId: existing.rows[0].conversation_id })
    }

    // Create new conversation
    const conv = await query(
      `INSERT INTO conversations (type) VALUES ('direct') RETURNING id`
    )
    const convId = conv.rows[0].id

    // Add both members
    await query(
      `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'member'), ($1, $3, 'member')`,
      [convId, payload.userId, targetUserId]
    )

    return NextResponse.json({ conversationId: convId })
  } catch (error: any) {
    console.error('Create conversation error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
