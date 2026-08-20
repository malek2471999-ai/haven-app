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

    const conversationId = params.id

    const activeCall = await query(
      `SELECT * FROM call_sessions
       WHERE conversation_id = $1 AND status IN ('ringing', 'active')
       ORDER BY created_at DESC LIMIT 1`,
      [conversationId]
    )

    if (activeCall.rows.length > 0) {
      return NextResponse.json({ call: activeCall.rows[0] })
    }

    return NextResponse.json({ call: null })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
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

    const conversationId = params.id
    const body = await request.json()
    const { action, callId } = body

    if (action === 'create') {
      const existing = await query(
        `SELECT id FROM call_sessions
         WHERE conversation_id = $1 AND status IN ('ringing', 'active')
         AND caller_id = $2`,
        [conversationId, payload.userId]
      )
      if (existing.rows.length > 0) {
        return NextResponse.json({ call: existing.rows[0] })
      }

      const result = await query(
        `INSERT INTO call_sessions (conversation_id, caller_id, status)
         VALUES ($1, $2, 'ringing') RETURNING *`,
        [conversationId, payload.userId]
      )

      const memberRes = await query(
        `SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND user_id != $2`,
        [conversationId, payload.userId]
      )
      for (const member of memberRes.rows) {
        await query(
          `INSERT INTO notifications (user_id, from_user_id, type, reference_id, content)
           VALUES ($1, $2, 'call', $3, 'مكالمة صوتية واردة')`,
          [member.user_id, payload.userId, result.rows[0].id]
        )
      }

      return NextResponse.json({ call: result.rows[0] })
    }

    if (action === 'answer' && callId) {
      await query(
        `UPDATE call_sessions SET status = 'active', answered_at = NOW() WHERE id = $1`,
        [callId]
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'end' && callId) {
      await query(
        `UPDATE call_sessions SET status = 'ended', ended_at = NOW(),
         duration = EXTRACT(EPOCH FROM (NOW() - COALESCE(answered_at, created_at)))
         WHERE id = $1`,
        [callId]
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ: ' + error.message }, { status: 500 })
  }
}
