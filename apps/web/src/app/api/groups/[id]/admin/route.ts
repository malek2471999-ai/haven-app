import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

// POST: Kick, ban, change role
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const { action, targetUserId, role } = await request.json()
    const groupId = params.id

    // Check if user is admin
    const membership = await query(
      `SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [groupId, payload.userId]
    )

    if (membership.rows.length === 0 || !['admin', 'owner'].includes(membership.rows[0].role)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    switch (action) {
      case 'kick':
        await query(
          `DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
          [groupId, targetUserId]
        )
        return NextResponse.json({ ok: true, action: 'kicked' })

      case 'ban':
        await query(
          `UPDATE conversation_members SET is_banned = TRUE WHERE conversation_id = $1 AND user_id = $2`,
          [groupId, targetUserId]
        )
        return NextResponse.json({ ok: true, action: 'banned' })

      case 'unban':
        await query(
          `UPDATE conversation_members SET is_banned = FALSE WHERE conversation_id = $1 AND user_id = $2`,
          [groupId, targetUserId]
        )
        return NextResponse.json({ ok: true, action: 'unbanned' })

      case 'promote':
        if (!['admin', 'moderator'].includes(role)) {
          return NextResponse.json({ error: 'دور غير صالح' }, { status: 400 })
        }
        await query(
          `UPDATE conversation_members SET role = $1 WHERE conversation_id = $2 AND user_id = $3`,
          [role, groupId, targetUserId]
        )
        return NextResponse.json({ ok: true, action: 'promoted', role })

      case 'demote':
        await query(
          `UPDATE conversation_members SET role = 'member' WHERE conversation_id = $1 AND user_id = $2`,
          [groupId, targetUserId]
        )
        return NextResponse.json({ ok: true, action: 'demoted' })

      default:
        return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
