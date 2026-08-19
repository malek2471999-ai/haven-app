import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const msg = await query(
      `SELECT user_id FROM group_messages WHERE id = $1`,
      [params.id]
    )
    if (msg.rows.length === 0) {
      return NextResponse.json({ error: 'الرسالة غير موجودة' }, { status: 404 })
    }

    // Check if user is admin or message owner
    const groupId = request.nextUrl.searchParams.get('groupId')
    const membership = await query(
      `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, payload.userId]
    )
    const isAdmin = membership.rows.length > 0 && ['admin', 'owner'].includes(membership.rows[0].role)
    const isOwner = msg.rows[0].user_id === payload.userId

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    await query(
      `UPDATE group_messages SET is_deleted = TRUE, content = '' WHERE id = $1`,
      [params.id]
    )

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
