import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const since = request.nextUrl.searchParams.get('since') || '1970-01-01T00:00:00.000Z'
    const callId = params.id

    const signals = await query(
      `SELECT * FROM call_signals
       WHERE call_id = $1 AND created_at > $2
       ORDER BY created_at ASC LIMIT 50`,
      [callId, since]
    )

    return NextResponse.json({ signals: signals.rows })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const body = await request.json()
    const { type, data } = body
    const callId = params.id

    if (!type || !data) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO call_signals (call_id, user_id, type, data)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [callId, payload.userId, type, JSON.stringify(data)]
    )

    return NextResponse.json({ signal: result.rows[0] })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ: ' + error.message }, { status: 500 })
  }
}
