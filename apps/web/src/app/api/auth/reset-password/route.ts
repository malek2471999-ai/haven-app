import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'الرمز وكلمة المرور مطلوبان' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }, { status: 400 })
    }

    const result = await query(
      `SELECT pr.id, pr.user_id, pr.expires_at, pr.used
       FROM password_resets pr
       WHERE pr.token = $1 AND pr.used = FALSE AND pr.expires_at > NOW()`,
      [token]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'الرمز غير صالح أو منتهي الصلاحية' }, { status: 400 })
    }

    const reset = result.rows[0]
    const passwordHash = await bcrypt.hash(password, 12)

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, reset.user_id])
    await query('UPDATE password_resets SET used = TRUE WHERE id = $1', [reset.id])

    return NextResponse.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' })
  } catch (error: any) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
