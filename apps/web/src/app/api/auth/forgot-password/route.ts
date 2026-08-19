import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'اسم المستخدم مطلوب' }, { status: 400 })
    }

    const result = await query(
      'SELECT id, email FROM users WHERE lower(username) = lower($1)',
      [username]
    )

    // Always return success to prevent username enumeration
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'إذا كان الحساب موجوداً، سيتم إرسال رابط الاسترداد',
      })
    }

    const user = result.rows[0]
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, resetToken, expiresAt]
    )

    console.log(`[PASSWORD RESET] User: ${username}, Token: ${resetToken}`)

    return NextResponse.json({
      success: true,
      message: 'إذا كان الحساب موجوداً، سيتم إرسال رابط الاسترداد',
      // In development, return the token for testing
      ...(process.env.NEXT_PUBLIC_ENV === 'development' && { resetToken }),
    })
  } catch (error: any) {
    console.error('Password reset request error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
