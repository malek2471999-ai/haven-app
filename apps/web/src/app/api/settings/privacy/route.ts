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
      `SELECT * FROM privacy_settings WHERE user_id = $1`,
      [payload.userId]
    )

    if (result.rows.length === 0) {
      // Create default settings
      await query(
        `INSERT INTO privacy_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [payload.userId]
      )
      const retry = await query(`SELECT * FROM privacy_settings WHERE user_id = $1`, [payload.userId])
      return NextResponse.json({ settings: retry.rows[0] || {
        last_seen_visibility: 'followers',
        online_status_visibility: 'followers',
        dm_privacy: 'followers',
        story_privacy: 'followers',
        group_invite_privacy: 'friends',
        allow_search_discovery: true,
        allow_mention: true,
      }})
    }

    return NextResponse.json({ settings: result.rows[0] })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const body = await request.json()
    const { last_seen_visibility, online_status_visibility, dm_privacy, story_privacy, group_invite_privacy, allow_search_discovery, allow_mention } = body

    await query(
      `INSERT INTO privacy_settings (user_id, last_seen_visibility, online_status_visibility, dm_privacy, story_privacy, group_invite_privacy, allow_search_discovery, allow_mention)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO UPDATE SET
         last_seen_visibility = $2, online_status_visibility = $3, dm_privacy = $4,
         story_privacy = $5, group_invite_privacy = $6, allow_search_discovery = $7, allow_mention = $8`,
      [payload.userId, last_seen_visibility, online_status_visibility, dm_privacy, story_privacy, group_invite_privacy, allow_search_discovery, allow_mention]
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}