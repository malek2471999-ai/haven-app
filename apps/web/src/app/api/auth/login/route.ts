import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { query } from '@/lib/db'
import { signToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const { username, password, twoFactorCode } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' }, { status: 400 })
    }

    const result = await query(
      `SELECT id, email, username, display_name, avatar_url, cover_url, bio, website, location, is_private, is_verified, followers_count, following_count, posts_count, created_at, password_hash
       FROM users WHERE lower(username) = lower($1)`,
      [username]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)

    if (!valid) {
      return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 })
    }

    // Check if 2FA is enabled
    const twoFactorResult = await query(
      `SELECT is_enabled, secret FROM two_factor_auth WHERE user_id = $1`,
      [user.id]
    )

    const is2FAEnabled = twoFactorResult.rows.length > 0 && twoFactorResult.rows[0].is_enabled

    if (is2FAEnabled) {
      // 2FA is enabled - need to verify code
      if (!twoFactorCode) {
        // Return temporary token for 2FA verification
        const tempToken = signToken({ userId: user.id, type: '2fa_pending', username: user.username })
        return NextResponse.json({
          requires2FA: true,
          tempToken,
          message: 'أدخل كود التحقق من تطبيق المصادقة',
        })
      }

      // Verify 2FA code
      const secret = twoFactorResult.rows[0].secret
      const epoch = Math.floor(Date.now() / 1000)
      const counter = Math.floor(epoch / 30)

      // Simple TOTP verification
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
      let bits = ''
      for (const char of secret.toUpperCase()) {
        const val = alphabet.indexOf(char)
        if (val === -1) continue
        bits += val.toString(2).padStart(5, '0')
      }

      const bytes = new Uint8Array(Math.ceil(bits.length / 8))
      for (let i = 0; i < bits.length; i++) {
        if (bits[i] === '1') bytes[Math.floor(i / 8)] |= (1 << (7 - (i % 8)))
      }

      const counterBuffer = new ArrayBuffer(8)
      const counterView = new DataView(counterBuffer)
      counterView.setUint32(4, counter, false)

      const key = await crypto.subtle.importKey(
        'raw',
        bytes,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      )
      const hash = await crypto.subtle.sign('HMAC', key, counterBuffer)
      const hashArray = new Uint8Array(hash)
      const offset = hashArray[19] & 0x0f
      const expectedCode = (
        ((hashArray[offset] & 0x7f) << 24) |
        ((hashArray[offset + 1] & 0xff) << 16) |
        ((hashArray[offset + 2] & 0xff) << 8) |
        (hashArray[offset + 3] & 0xff)
      ) % 1000000

      const expectedCodeStr = expectedCode.toString().padStart(6, '0')

      // Check current and adjacent time windows (±1)
      const codes = [expectedCodeStr]
      for (const offset of [-1, 1]) {
        const prevCounter = counter + offset
        const prevCounterBuffer = new ArrayBuffer(8)
        const prevCounterView = new DataView(prevCounterBuffer)
        prevCounterView.setUint32(4, prevCounter, false)
        const prevHash = await crypto.subtle.sign('HMAC', key, prevCounterBuffer)
        const prevHashArray = new Uint8Array(prevHash)
        const prevOffset = prevHashArray[19] & 0x0f
        const prevCode = (
          ((prevHashArray[prevOffset] & 0x7f) << 24) |
          ((prevHashArray[prevOffset + 1] & 0xff) << 16) |
          ((prevHashArray[prevOffset + 2] & 0xff) << 8) |
          (prevHashArray[prevOffset + 3] & 0xff)
        ) % 1000000
        codes.push(prevCode.toString().padStart(6, '0'))
      }

      if (!codes.includes(twoFactorCode)) {
        return NextResponse.json({ error: 'كود التحقق غير صحيح' }, { status: 401 })
      }
    }

    delete user.password_hash

    const token = signToken({ userId: user.id, email: user.email, username: user.username })

    const response = NextResponse.json({ user, token })
    response.cookies.set('haven_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'حدث خطأ أثناء تسجيل الدخول' }, { status: 500 })
  }
}
