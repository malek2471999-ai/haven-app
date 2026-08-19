import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const q = request.nextUrl.searchParams.get('q')

    let result
    if (q && q.trim()) {
      const search = `%${q.trim()}%`
      result = await query(
        `SELECT id, username, display_name, avatar_url, is_verified, followers_count, bio
         FROM users WHERE (username ILIKE $1 OR display_name ILIKE $1) AND id != $2 LIMIT 20`,
        [search, payload.userId]
      )
    } else {
      result = await query(
        `SELECT id, username, display_name, avatar_url, is_verified, followers_count, bio
         FROM users WHERE id != $1 ORDER BY followers_count DESC LIMIT 10`,
        [payload.userId]
      )
    }

    return NextResponse.json({ users: result.rows })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}