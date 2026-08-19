const { Pool } = require('pg')
const crypto = require('crypto')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'haven_db',
  user: 'bab_user',
  password: 'bab_password',
})

async function createRecoveryCodesTable() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS recovery_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code VARCHAR(8) NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recovery_codes_user ON recovery_codes(user_id)`)
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_recovery_codes_unique ON recovery_codes(user_id, code)`)
    console.log('recovery_codes table created')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

createRecoveryCodesTable()
