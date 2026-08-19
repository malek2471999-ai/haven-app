const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'haven_db',
  user: 'bab_user',
  password: 'bab_password',
});

async function migrate() {
  const client = await pool.connect();
  try {
    // Add is_pinned and pinned_at to messages
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id);
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded BOOLEAN DEFAULT FALSE;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Add last_typed_at to conversation_members
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE conversation_members ADD COLUMN IF NOT EXISTS last_typed_at TIMESTAMPTZ;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Add expires_at to messages for disappearing messages
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
