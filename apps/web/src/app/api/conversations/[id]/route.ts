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

    const convResult = await query(`SELECT * FROM conversations WHERE id = $1`, [params.id])
    if (convResult.rows.length === 0) {
      return NextResponse.json({ error: 'محادثة غير موجودة' }, { status: 404 })
    }

    const members = await query(
      `SELECT cm.user_id, u.display_name, u.avatar_url, u.username, u.is_verified
       FROM conversation_members cm JOIN users u ON u.id = cm.user_id
       WHERE cm.conversation_id = $1`,
      [params.id]
    )

    const otherMember = members.rows.find((m: any) => m.user_id !== payload.userId)

    const msgs = await query(
      `SELECT m.*, u.display_name, u.avatar_url, u.username
       FROM messages m JOIN users u ON u.id = m.user_id
       WHERE m.conversation_id = $1 ORDER BY m.created_at ASC LIMIT 100`,
      [params.id]
    )

    return NextResponse.json({
      conversation: convResult.rows[0],
      other_user: otherMember || null,
      messages: msgs.rows,
    })
  } catch (error: any) {
    console.error('Conversation detail error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}