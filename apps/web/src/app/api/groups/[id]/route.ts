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

    const grp = await query(`SELECT * FROM groups WHERE id = $1`, [params.id])
    if (grp.rows.length === 0) {
      return NextResponse.json({ error: 'مجموعة غير موجودة' }, { status: 404 })
    }

    const isAnonymous = grp.rows[0].is_anonymous || false

    let members
    if (isAnonymous) {
      // Anonymous group: show count but hide identities
      const memberCount = await query(
        `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
        [params.id]
      )

      // Check if current user is owner
      const myMembership = await query(
        `SELECT gm.role FROM group_members gm WHERE gm.group_id = $1 AND gm.user_id = $2`,
        [params.id, payload.userId]
      )
      const isOwner = myMembership.rows.length > 0 && myMembership.rows[0].role === 'owner'

      if (isOwner) {
        // Owner can see everyone with usernames
        const allMembers = await query(
          `SELECT gm.user_id, gm.role, gm.joined_at, gm.can_write, u.display_name, u.avatar_url, u.username, u.is_verified
           FROM group_members gm JOIN users u ON u.id = gm.user_id
           WHERE gm.group_id = $1 ORDER BY gm.joined_at ASC`,
          [params.id]
        )
        members = allMembers.rows.map((m: any) => ({
          ...m,
          display_name: m.role === 'owner' ? `${m.display_name} (مالك)` : m.display_name,
        }))
      } else {
        // Regular member: only see self
        const myData = await query(
          `SELECT gm.*, u.display_name, u.avatar_url, u.username, u.is_verified
           FROM group_members gm JOIN users u ON u.id = gm.user_id
           WHERE gm.group_id = $1 AND gm.user_id = $2`,
          [params.id, payload.userId]
        )
        members = myData.rows.length > 0 ? [{
          ...myData.rows[0],
          display_name: 'أنت',
          username: 'you',
        }] : []
      }
      grp.rows[0].members_count = parseInt(memberCount.rows[0].count)
    } else {
      members = (await query(
        `SELECT gm.user_id, gm.role, gm.joined_at, u.display_name, u.avatar_url, u.username, u.is_verified
         FROM group_members gm JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = $1 ORDER BY gm.joined_at ASC`,
        [params.id]
      )).rows
    }

    return NextResponse.json({ group: grp.rows[0], members })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}