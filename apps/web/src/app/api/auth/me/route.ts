import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })
    }

    const result = await query(
      `SELECT id, email, username, display_name, avatar_url, cover_url, bio, website, location, is_private, is_verified, followers_count, following_count, posts_count, created_at
       FROM users WHERE id = $1`,
      [payload.userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    }

    return NextResponse.json({ user: result.rows[0] })
  } catch (error: any) {
    console.error('Auth check error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
