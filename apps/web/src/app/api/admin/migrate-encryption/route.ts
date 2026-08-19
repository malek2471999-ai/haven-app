import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS encryption_keys (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        public_key TEXT NOT NULL,
        private_key TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await query(`CREATE INDEX IF NOT EXISTS idx_encryption_keys_user ON encryption_keys(user_id)`)

    return NextResponse.json({ success: true, message: 'encryption_keys table created' })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
