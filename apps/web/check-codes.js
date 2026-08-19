const { Pool } = require('pg')
const pool = new Pool({ host: 'localhost', port: 5432, database: 'haven_db', user: 'bab_user', password: 'bab_password' })

async function check() {
  const r = await pool.query(`
    SELECT u.username, rc.code, rc.is_used
    FROM recovery_codes rc
    JOIN users u ON u.id = rc.user_id
    ORDER BY u.username
  `)
  for (const row of r.rows) {
    const status = row.is_used ? '❌ مستخدم' : '✅ جاهز'
    console.log(`${row.username}: ${row.code} ${status}`)
  }
  await pool.end()
}
check()
