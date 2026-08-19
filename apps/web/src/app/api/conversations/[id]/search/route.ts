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

    const q = request.nextUrl.searchParams.get('q')
    if (!q || q.trim().length === 0) {
      return NextResponse.json({ messages: [] })
    }

    const msgs = await query(
      `SELECT m.*, u.display_name, u.avatar_url, u.username
       FROM messages m JOIN users u ON u.id = m.user_id
       WHERE m.conversation_id = $1
         AND m.content ILIKE $2
         AND m.type = 'text'
         AND m.is_deleted = FALSE
       ORDER BY m.created_at DESC LIMIT 50`,
      [params.id, `%${q.trim()}%`]
    )

    return NextResponse.json({ messages: msgs.rows })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
