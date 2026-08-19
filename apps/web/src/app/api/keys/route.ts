import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const recipientId = request.nextUrl.searchParams.get('userId')

    if (recipientId) {
      // Get recipient's public key
      const result = await query(
        `SELECT user_id, public_key FROM encryption_keys WHERE user_id = $1`,
        [recipientId]
      )
      return NextResponse.json({ publicKey: result.rows[0]?.public_key || null })
    } else {
      // Get my own keys
      const result = await query(
        `SELECT public_key, private_key FROM encryption_keys WHERE user_id = $1`,
        [payload.userId]
      )
      return NextResponse.json({
        publicKey: result.rows[0]?.public_key || null,
        privateKey: result.rows[0]?.private_key || null,
      })
    }
  } catch (error: any) {
    console.error('Keys error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const { publicKey, privateKey } = await request.json()
    if (!publicKey || !privateKey) {
      return NextResponse.json({ error: 'المفاتيح مطلوبة' }, { status: 400 })
    }

    // Upsert keys
    await query(
      `INSERT INTO encryption_keys (user_id, public_key, private_key)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET public_key = $2, private_key = $3`,
      [payload.userId, publicKey, privateKey]
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Save keys error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
