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

    // Check if anonymous
    const groupInfo = await query(`SELECT is_anonymous FROM groups WHERE id = $1`, [params.id])
    const isAnonymous = groupInfo.rows[0]?.is_anonymous || false

    // Check if owner
    let isOwner = false
    if (isAnonymous) {
      const ownerCheck = await query(
        `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
        [params.id, payload.userId]
      )
      isOwner = ownerCheck.rows.length > 0 && ownerCheck.rows[0].role === 'owner'
    }

    const typingUsers = await query(
      `SELECT gm.user_id, u.display_name, u.username
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
         AND gm.user_id != $2
         AND gm.last_typed_at > NOW() - INTERVAL '5 seconds'`,
      [params.id, payload.userId]
    )

    const count = typingUsers.rows.length
    let names: string[] = []

    if (isAnonymous) {
      if (isOwner) {
        // Owner sees real names
        names = typingUsers.rows.map((u: any) => u.display_name)
      } else {
        // Others just see "عضو"
        if (count > 0) names = ['عضو']
      }
    } else {
      names = typingUsers.rows.map((u: any) => u.display_name)
    }

    return NextResponse.json({ typing: names, count, isAnonymous })
  } catch {
    return NextResponse.json({ typing: [], count: 0 })
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

    const { action } = await request.json()

    if (action === 'typing') {
      await query(
        `UPDATE group_members SET last_typed_at = NOW() WHERE group_id = $1 AND user_id = $2`,
        [params.id, payload.userId]
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
