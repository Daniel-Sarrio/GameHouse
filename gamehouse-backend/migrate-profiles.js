const fs = require('fs');
const path = require('path');

async function migrateProfiles(client) {
  const { rows } = await client.query(`SELECT data_type FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'id'`);
  if (rows[0]?.data_type === 'uuid') {
    await client.query(`CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      first_name VARCHAR(100), last_name VARCHAR(100), phone VARCHAR(30), avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await client.query('INSERT INTO profiles (user_id) SELECT id FROM users ON CONFLICT (user_id) DO NOTHING');
    return;
  }
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '001_profiles.sql'), 'utf8');
  await client.query(sql);
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
  const pool = require('./src/config/database');
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await migrateProfiles(client);
    await client.query('COMMIT');
    console.log('Migración de profiles completada.');
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error durante la migración de profiles:', error.message || error.code);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

if (require.main === module) main();

module.exports = migrateProfiles;
