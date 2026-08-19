import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'
import crypto from 'crypto'

// Generate 8 recovery codes
function generateRecoveryCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < 8; i++) {
    // Format: XXXX-XXXX (8 chars with dash)
    const bytes = crypto.randomBytes(4)
    const code = bytes.toString('hex').toUpperCase()
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`)
  }
  return codes
}

// GET: Get existing recovery codes (or generate new ones)
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    // Check existing codes
    const existing = await query(
      `SELECT code, is_used FROM recovery_codes WHERE user_id = $1 ORDER BY created_at ASC`,
      [payload.userId]
    )

    if (existing.rows.length > 0) {
      return NextResponse.json({
        codes: existing.rows.map((r: any) => ({
          code: r.code,
          is_used: r.is_used,
        })),
        hasCodes: true,
      })
    }

    // Generate new codes
    const codes = generateRecoveryCodes()
    for (const code of codes) {
      await query(
        `INSERT INTO recovery_codes (user_id, code) VALUES ($1, $2)`,
        [payload.userId, code]
      )
    }

    return NextResponse.json({
      codes: codes.map(code => ({ code, is_used: false })),
      hasCodes: true,
      newlyGenerated: true,
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// POST: Use a recovery code to login (no username/password needed)
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'أدخل كود الاسترداد' }, { status: 400 })
    }

    // Format code: remove dash if user entered without it
    const formattedCode = code.replace('-', '').toUpperCase()
    const searchCode = `${formattedCode.slice(0, 4)}-${formattedCode.slice(4, 8)}`

    // Find code
    const codeResult = await query(
      `SELECT rc.id, rc.user_id, u.id as uid, u.email, u.username, u.display_name, u.avatar_url
       FROM recovery_codes rc
       JOIN users u ON u.id = rc.user_id
       WHERE rc.code = $1 AND rc.is_used = FALSE`,
      [searchCode]
    )

    if (codeResult.rows.length === 0) {
      return NextResponse.json({ error: 'كود الاسترداد غير صالح أو مستخدم بالفعل' }, { status: 400 })
    }

    const user = codeResult.rows[0]

    // Mark code as used
    await query(
      `UPDATE recovery_codes SET is_used = TRUE, used_at = NOW() WHERE id = $1`,
      [user.id]
    )

    // Generate new token and login
    const { signToken } = await import('@/lib/jwt')
    const token = signToken({ userId: user.uid, email: user.email, username: user.username })

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.uid,
        email: user.email,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
