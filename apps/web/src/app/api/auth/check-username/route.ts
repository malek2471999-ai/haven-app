import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  if (!username || username.length < 3) {
    return NextResponse.json({ available: false })
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return NextResponse.json({ available: false })
  }

  const RESERVED = [
    'admin', 'administrator', 'support', 'haven', 'security',
    'root', 'system', 'api', 'moderator', 'mod', 'staff',
    'official', 'billing', 'help', 'status', 'team',
  ]

  if (RESERVED.includes(username.toLowerCase())) {
    return NextResponse.json({ available: false })
  }

  const result = await query('SELECT id FROM users WHERE lower(username) = lower($1)', [username])
  return NextResponse.json({ available: result.rows.length === 0 })
}
