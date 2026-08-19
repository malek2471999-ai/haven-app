import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const { current_password, new_password } = await request.json()
    if (!current_password || !new_password) {
      return NextResponse.json({ error: 'كلمة المرور الحالية والجديدة مطلوبة' }, { status: 400 })
    }

    if (new_password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' }, { status: 400 })
    }

    // Verify current password
    const user = await query(`SELECT password_hash FROM users WHERE id = $1`, [payload.userId])
    const valid = await bcrypt.compare(current_password, user.rows[0].password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 400 })
    }

    // Update password
    const hash = await bcrypt.hash(new_password, 12)
    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, payload.userId])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
