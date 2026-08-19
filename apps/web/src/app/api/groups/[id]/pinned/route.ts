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

    const pinned = await query(
      `SELECT gm.*, u.display_name, u.avatar_url, u.username
       FROM group_messages gm JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1 AND gm.is_pinned = TRUE
       ORDER BY gm.pinned_at DESC`,
      [params.id]
    )

    return NextResponse.json({ pinned: pinned.rows })
  } catch {
    return NextResponse.json({ pinned: [] })
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

    const { messageId, pin } = await request.json()

    // Check if user is admin
    const membership = await query(
      `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [params.id, payload.userId]
    )
    const isAdmin = membership.rows.length > 0 && ['admin', 'owner'].includes(membership.rows[0].role)

    // Only admins can pin, anyone can unpin their own
    if (pin && !isAdmin) {
      const msg = await query(`SELECT user_id FROM group_messages WHERE id = $1`, [messageId])
      if (msg.rows.length === 0 || msg.rows[0].user_id !== payload.userId) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      }
    }

    await query(
      `UPDATE group_messages SET is_pinned = $1, pinned_at = ${pin ? 'NOW()' : 'NULL'} WHERE id = $2 AND group_id = $3`,
      [pin, messageId, params.id]
    )

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
