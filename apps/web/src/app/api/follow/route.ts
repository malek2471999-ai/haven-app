import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const { userId: targetUserId } = await request.json()
    if (!targetUserId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 })
    }

    if (payload.userId === targetUserId) {
      return NextResponse.json({ error: 'لا يمكنك متابعة نفسك' }, { status: 400 })
    }

    // Check if already following
    const existing = await query(
      `SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [payload.userId, targetUserId]
    )

    if (existing.rows.length > 0) {
      // Unfollow
      await query(
        `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
        [payload.userId, targetUserId]
      )
      await query(`UPDATE users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = $1`, [targetUserId])
      await query(`UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = $1`, [payload.userId])
      return NextResponse.json({ following: false })
    } else {
      // Follow
      await query(
        `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)`,
        [payload.userId, targetUserId]
      )
      await query(`UPDATE users SET followers_count = followers_count + 1 WHERE id = $1`, [targetUserId])
      await query(`UPDATE users SET following_count = following_count + 1 WHERE id = $1`, [payload.userId])

      // Create notification
      await query(
        `INSERT INTO notifications (user_id, type, from_user_id, entity_type, entity_id)
         VALUES ($1, 'follow', $2, 'user', $2)`,
        [targetUserId, payload.userId]
      )

      return NextResponse.json({ following: true })
    }
  } catch (error: any) {
    console.error('Follow error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
