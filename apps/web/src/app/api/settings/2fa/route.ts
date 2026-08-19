import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'
import crypto from 'crypto'

// Generate TOTP secret
function generateSecret(): string {
  const bytes = crypto.randomBytes(20)
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const b of bytes) {
    bits += b.toString(2).padStart(8, '0')
  }
  let result = ''
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0')
    result += alphabet[parseInt(chunk, 2)]
  }
  return result
}

// Generate TOTP code from secret
async function generateTOTP(secret: string, timeStep: number = 30): Promise<string> {
  const epoch = Math.floor(Date.now() / 1000)
  const counter = Math.floor(epoch / timeStep)

  // Decode base32 secret
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const char of secret.toUpperCase()) {
    const val = alphabet.indexOf(char)
    if (val === -1) continue
    bits += val.toString(2).padStart(5, '0')
  }

  // Convert bits to buffer
  const bytes = new Uint8Array(Math.ceil(bits.length / 8))
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') bytes[Math.floor(i / 8)] |= (1 << (7 - (i % 8)))
  }

  // Counter to buffer (8 bytes big-endian)
  const counterBuffer = new ArrayBuffer(8)
  const counterView = new DataView(counterBuffer)
  counterView.setUint32(4, counter, false)

  // HMAC-SHA1
  const key = await crypto.subtle.importKey(
    'raw',
    bytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  const hash = await crypto.subtle.sign('HMAC', key, counterBuffer)
  const hashArray = new Uint8Array(hash)

  // Dynamic truncation
  const offset = hashArray[19] & 0x0f
  const code = (
    ((hashArray[offset] & 0x7f) << 24) |
    ((hashArray[offset + 1] & 0xff) << 16) |
    ((hashArray[offset + 2] & 0xff) << 8) |
    (hashArray[offset + 3] & 0xff)
  ) % 1000000

  return code.toString().padStart(6, '0')
}

// GET: Get 2FA status
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const result = await query(
      `SELECT is_enabled, created_at, enabled_at FROM two_factor_auth WHERE user_id = $1`,
      [payload.userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ enabled: false })
    }

    return NextResponse.json({
      enabled: result.rows[0].is_enabled,
      createdAt: result.rows[0].created_at,
      enabledAt: result.rows[0].enabled_at,
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// POST: Setup/Enable/Disable 2FA
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const { action, code } = await request.json()

    if (action === 'setup') {
      // Generate new secret
      const secret = generateSecret()

      // Upsert
      await query(
        `INSERT INTO two_factor_auth (user_id, secret) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET secret = $2, is_enabled = FALSE`,
        [payload.userId, secret]
      )

      // Generate QR code URL (otpauth://totp/HAVEN:username?secret=xxx&issuer=HAVEN)
      const username = payload.username || 'user'
      const qrUrl = `otpauth://totp/HAVEN:${username}?secret=${secret}&issuer=HAVEN`

      return NextResponse.json({
        secret,
        qrUrl,
      })
    }

    if (action === 'verify') {
      // Verify code and enable 2FA
      const result = await query(
        `SELECT secret FROM two_factor_auth WHERE user_id = $1`,
        [payload.userId]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'قم بالإعداد أولاً' }, { status: 400 })
      }

      const secret = result.rows[0].secret
      const epoch = Math.floor(Date.now() / 1000)
      const counter = Math.floor(epoch / 30)

      // Check current and adjacent time windows (±1)
      const validCodes: string[] = []
      for (const offset of [-1, 0, 1]) {
        const c = counter + offset
        const counterBuffer = new ArrayBuffer(8)
        const counterView = new DataView(counterBuffer)
        counterView.setUint32(4, c, false)

        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
        let bits = ''
        for (const ch of secret.toUpperCase()) {
          const val = alphabet.indexOf(ch)
          if (val === -1) continue
          bits += val.toString(2).padStart(5, '0')
        }
        const bytes = new Uint8Array(Math.ceil(bits.length / 8))
        for (let i = 0; i < bits.length; i++) {
          if (bits[i] === '1') bytes[Math.floor(i / 8)] |= (1 << (7 - (i % 8)))
        }
        const key = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
        const hash = await crypto.subtle.sign('HMAC', key, counterBuffer)
        const hashArray = new Uint8Array(hash)
        const hashOffset = hashArray[19] & 0x0f
        const cCode = (
          ((hashArray[hashOffset] & 0x7f) << 24) |
          ((hashArray[hashOffset + 1] & 0xff) << 16) |
          ((hashArray[hashOffset + 2] & 0xff) << 8) |
          (hashArray[hashOffset + 3] & 0xff)
        ) % 1000000
        validCodes.push(cCode.toString().padStart(6, '0'))
      }

      if (!validCodes.includes(code)) {
        return NextResponse.json({ error: 'الكود غير صحيح' }, { status: 400 })
      }

      await query(
        `UPDATE two_factor_auth SET is_enabled = TRUE, enabled_at = NOW() WHERE user_id = $1`,
        [payload.userId]
      )

      return NextResponse.json({ success: true, enabled: true })
    }

    if (action === 'disable') {
      // Disable 2FA
      const result = await query(
        `SELECT secret FROM two_factor_auth WHERE user_id = $1 AND is_enabled = TRUE`,
        [payload.userId]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'التحقق بخطوتين غير مفعّل' }, { status: 400 })
      }

      const secret = result.rows[0].secret
      const expectedCode = await generateTOTP(secret)

      if (code !== expectedCode) {
        return NextResponse.json({ error: 'الكود غير صحيح' }, { status: 400 })
      }

      await query(
        `UPDATE two_factor_auth SET is_enabled = FALSE WHERE user_id = $1`,
        [payload.userId]
      )

      return NextResponse.json({ success: true, enabled: false })
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
