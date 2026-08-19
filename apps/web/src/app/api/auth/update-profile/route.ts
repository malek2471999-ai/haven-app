import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const { display_name, bio, location, website, avatar_url, cover_url } = await request.json()

    const result = await query(
      `UPDATE users SET
        display_name = COALESCE($1, display_name),
        bio = $2,
        location = $3,
        website = $4,
        avatar_url = $5,
        cover_url = $6
       WHERE id = $7
       RETURNING id, email, username, display_name, avatar_url, cover_url, bio, website, location, is_private, is_verified, followers_count, following_count, posts_count, created_at`,
      [display_name, bio || null, location || null, website || null, avatar_url || null, cover_url || null, payload.userId]
    )

    return NextResponse.json({ user: result.rows[0] })
  } catch (error: any) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
