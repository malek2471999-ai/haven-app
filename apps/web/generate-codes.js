const { Pool } = require('pg')
const crypto = require('crypto')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'haven_db',
  user: 'bab_user',
  password: 'bab_password',
})

async function generateCodes() {
  const client = await pool.connect()
  try {
    // Get all users
    const users = await client.query('SELECT id, username FROM users')
    console.log(`Found ${users.rows.length} users`)

    for (const user of users.rows) {
      // Check if user already has codes
      const existing = await client.query(
        'SELECT COUNT(*) FROM recovery_codes WHERE user_id = $1',
        [user.id]
      )

      if (parseInt(existing.rows[0].count) > 0) {
        console.log(`User ${user.username} already has codes, skipping`)
        continue
      }

      // Generate 8 codes
      const codes = []
      for (let i = 0; i < 8; i++) {
        const bytes = crypto.randomBytes(4)
        const code = bytes.toString('hex').toUpperCase()
        codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`)
      }

      // Insert codes
      for (const code of codes) {
        await client.query(
          'INSERT INTO recovery_codes (user_id, code) VALUES ($1, $2)',
          [user.id, code]
        )
      }

      console.log(`User ${user.username}: Generated ${codes.length} codes`)
      console.log('Codes:', codes.join(', '))
    }

    console.log('\nDone!')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

generateCodes()
