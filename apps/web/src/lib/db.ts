import { Pool } from 'pg'

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'haven_db',
  user: 'bab_user',
  password: 'bab_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export default pool

export async function query(text: string, params?: any[]) {
  const result = await pool.query(text, params)
  return result
}
