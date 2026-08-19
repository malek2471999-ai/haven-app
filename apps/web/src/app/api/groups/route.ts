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
      `SELECT g.* FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = $1 ORDER BY g.members_count DESC`,
      [payload.userId]
    )

    return NextResponse.json({ groups: result.rows })
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const { name, description, is_private, is_anonymous } = await request.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'اسم المجموعة مطلوب' }, { status: 400 })
    }

    // Generate slug from name
    const slug = name.trim().toLowerCase().replace(/[^a-zA-Z0-9\u0600-\u06FF]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)

    const group = await query(
      `INSERT INTO groups (name, slug, description, owner_id, is_private, is_anonymous, members_count)
       VALUES ($1, $2, $3, $4, $5, $6, 1) RETURNING *`,
      [name.trim(), slug, description || null, payload.userId, is_private || false, is_anonymous || false]
    )

    const groupId = group.rows[0].id

    // Add owner as member
    await query(
      `INSERT INTO group_members (group_id, user_id, role, can_write) VALUES ($1, $2, 'owner', TRUE)`,
      [groupId, payload.userId]
    )

    // If anonymous group, set all future members as viewers by default
    // Owner keeps can_write = TRUE

    return NextResponse.json({ group: group.rows[0] })
  } catch (error: any) {
    console.error('Create group error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
