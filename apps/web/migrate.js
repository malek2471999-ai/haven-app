const { Pool } = require('pg')
const pool = new Pool({ host: 'localhost', port: 5432, database: 'haven_db', user: 'bab_user', password: 'bab_password' })

async function migrate() {
  await pool.query(`CREATE TABLE IF NOT EXISTS encryption_keys (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_encryption_keys_user ON encryption_keys(user_id)`)
  console.log('DONE: encryption_keys table created')
  process.exit(0)
}

migrate().catch(e => { console.error(e.message); process.exit(1) })
