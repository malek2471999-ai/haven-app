import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const result = await query(
      `SELECT p.*, 
        COALESCE((SELECT json_agg(json_build_object('id', pm.id, 'url', pm.url, 'type', pm.type, 'alt_text', pm.alt_text))
         FROM post_media pm WHERE pm.post_id = p.id), '[]') as media
       FROM posts p WHERE p.user_id = $1 ORDER BY p.created_at DESC LIMIT 20`,
      [payload.userId]
    )

    return NextResponse.json({ posts: result.rows })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}