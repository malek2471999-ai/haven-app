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
      `SELECT s.*, u.display_name, u.avatar_url, u.username
       FROM stories s JOIN users u ON u.id = s.user_id
       WHERE s.expires_at > NOW() ORDER BY s.created_at DESC`,
      []
    )

    return NextResponse.json({ stories: result.rows })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const { content, media_url, type } = await request.json()
    if (!content?.trim() && !media_url) {
      return NextResponse.json({ error: 'محتوى القصة مطلوب' }, { status: 400 })
    }

    // Story expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const result = await query(
      `INSERT INTO stories (user_id, type, content, media_url, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [payload.userId, type || 'text', content?.trim() || null, media_url || null, expiresAt]
    )

    const storyWithUser = await query(
      `SELECT s.*, u.display_name, u.avatar_url, u.username
       FROM stories s JOIN users u ON u.id = s.user_id WHERE s.id = $1`,
      [result.rows[0].id]
    )

    return NextResponse.json({ story: storyWithUser.rows[0] })
  } catch (error: any) {
    console.error('Create story error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
