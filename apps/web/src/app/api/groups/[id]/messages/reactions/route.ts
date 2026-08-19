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

    const reactions = await query(
      `SELECT gr.*, u.display_name, u.username
       FROM group_reactions gr JOIN users u ON u.id = gr.user_id
       WHERE gr.message_id = $1`,
      [params.id]
    )

    return NextResponse.json({ reactions: reactions.rows })
  } catch {
    return NextResponse.json({ reactions: [] })
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

    const { emoji } = await request.json()
    const messageId = params.id

    const existing = await query(
      `SELECT id FROM group_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
      [messageId, payload.userId, emoji]
    )

    if (existing.rows.length > 0) {
      await query(
        `DELETE FROM group_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
        [messageId, payload.userId, emoji]
      )
      return NextResponse.json({ action: 'removed' })
    } else {
      await query(
        `INSERT INTO group_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)`,
        [messageId, payload.userId, emoji]
      )
      return NextResponse.json({ action: 'added' })
    }
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
