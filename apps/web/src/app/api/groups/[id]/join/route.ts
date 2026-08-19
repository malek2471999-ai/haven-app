import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    // Check if already member
    const existing = await query(
      `SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [params.id, payload.userId]
    )

    if (existing.rows.length > 0) {
      // Leave group (unless owner)
      if (existing.rows[0].role === 'owner') {
        return NextResponse.json({ error: 'لا يمكن المالك مغادرة المجموعة' }, { status: 400 })
      }
      await query(`DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`, [params.id, payload.userId])
      await query(`UPDATE groups SET members_count = GREATEST(members_count - 1, 0) WHERE id = $1`, [params.id])
      return NextResponse.json({ joined: false })
    } else {
      // Check if group is anonymous
      const groupInfo = await query(`SELECT is_anonymous FROM groups WHERE id = $1`, [params.id])
      const isAnonymous = groupInfo.rows[0]?.is_anonymous || false

      if (isAnonymous) {
        // Anonymous group: new members are viewers (can't write)
        await query(
          `INSERT INTO group_members (group_id, user_id, role, can_write) VALUES ($1, $2, 'viewer', FALSE)`,
          [params.id, payload.userId]
        )
      } else {
        await query(`INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')`, [params.id, payload.userId])
      }
      await query(`UPDATE groups SET members_count = members_count + 1 WHERE id = $1`, [params.id])
      return NextResponse.json({ joined: true })
    }
  } catch (error: any) {
    console.error('Join group error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
