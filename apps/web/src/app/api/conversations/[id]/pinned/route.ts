import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

// GET: Get pinned messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const pinned = await query(
      `SELECT m.*, u.display_name, u.avatar_url, u.username
       FROM messages m
       JOIN users u ON u.id = m.user_id
       WHERE m.conversation_id = $1 AND m.is_pinned = TRUE
       ORDER BY m.pinned_at DESC`,
      [params.id]
    )

    return NextResponse.json({ pinned: pinned.rows })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// POST: Pin or unpin a message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const { messageId, pin } = await request.json()

    await query(
      `UPDATE messages SET is_pinned = $1, pinned_at = ${pin ? 'NOW()' : 'NULL'} WHERE id = $2 AND conversation_id = $3`,
      [pin, messageId, params.id]
    )

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
