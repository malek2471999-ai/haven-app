import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const [devicesRes, eventsRes] = await Promise.all([
      query(`SELECT * FROM devices WHERE user_id = $1 ORDER BY last_active DESC`, [payload.userId]),
      query(`SELECT * FROM security_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [payload.userId]),
    ])

    return NextResponse.json({ devices: devicesRes.rows, events: eventsRes.rows })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}