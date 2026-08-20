import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ call: null })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ call: null })

    const callRes = await query(
      `SELECT cs.*, u.display_name as caller_name, u.avatar_url as caller_avatar, u.username as caller_username
       FROM call_sessions cs
       JOIN conversation_members cm ON cm.conversation_id = cs.conversation_id AND cm.user_id != cs.caller_id
       JOIN users u ON u.id = cs.caller_id
       WHERE cm.user_id = $1 AND cs.status = 'ringing'
       ORDER BY cs.created_at DESC LIMIT 1`,
      [payload.userId]
    )

    if (callRes.rows.length > 0) {
      const call = callRes.rows[0]
      return NextResponse.json({
        call,
        caller: {
          id: call.caller_id,
          display_name: call.caller_name,
          avatar_url: call.caller_avatar,
          username: call.caller_username,
        },
        type: 'voice'
      })
    }

    return NextResponse.json({ call: null })
  } catch (error: any) {
    return NextResponse.json({ call: null })
  }
}
