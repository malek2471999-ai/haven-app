import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { query } from '@/lib/db'
import { signToken } from '@/lib/jwt'

const RESERVED_USERNAMES = [
  'admin', 'administrator', 'support', 'haven', 'security',
  'root', 'system', 'api', 'moderator', 'mod', 'staff',
  'official', 'billing', 'help', 'status', 'team',
]

function generateRecoveryCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < 8; i++) {
    const bytes = crypto.randomBytes(4)
    const code = bytes.toString('hex').toUpperCase()
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`)
  }
  return codes
}

export async function POST(request: NextRequest) {
  try {
    const { username, displayName, password } = await request.json()

    if (!username || !displayName || !password) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 })
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: 'اسم المستخدم يجب أن يكون 3-20 حرف' }, { status: 400 })
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: 'اسم المستخدم يحتوي على أحرف غير مسموحة' }, { status: 400 })
    }

    if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
      return NextResponse.json({ error: 'هذا الاسم محجوز' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }, { status: 400 })
    }

    const existing = await query('SELECT id FROM users WHERE lower(username) = lower($1)', [username])
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'اسم المستخدم مستخدم بالفعل' }, { status: 400 })
    }

    const email = `${username}@haven.local`
    const passwordHash = await bcrypt.hash(password, 12)

    const result = await query(
      `INSERT INTO users (email, username, display_name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, username, display_name, avatar_url, cover_url, bio, is_private, is_verified, followers_count, following_count, posts_count, created_at`,
      [email, username.toLowerCase(), displayName, passwordHash]
    )

    const user = result.rows[0]

    await query('INSERT INTO user_settings (user_id) VALUES ($1)', [user.id])
    await query('INSERT INTO privacy_settings (user_id) VALUES ($1)', [user.id])

    // Generate recovery codes
    const recoveryCodes = generateRecoveryCodes()
    for (const code of recoveryCodes) {
      await query(
        `INSERT INTO recovery_codes (user_id, code) VALUES ($1, $2)`,
        [user.id, code]
      )
    }

    const token = signToken({ userId: user.id, email: user.email, username: user.username })

    const response = NextResponse.json({
      user,
      token,
      recoveryCodes: recoveryCodes,
    })
    response.cookies.set('haven_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'حدث خطأ أثناء التسجيل' }, { status: 500 })
  }
}
