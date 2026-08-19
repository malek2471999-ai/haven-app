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

    // Check if message belongs to user
    const msg = await query(
      `SELECT user_id FROM messages WHERE id = $1`,
      [params.id]
    )

    if (msg.rows.length === 0) {
      return NextResponse.json({ error: 'الرسالة غير موجودة' }, { status: 404 })
    }

    if (msg.rows[0].user_id !== payload.userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    await query(
      `UPDATE messages SET is_deleted = TRUE, content = '' WHERE id = $1`,
      [params.id]
    )

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
