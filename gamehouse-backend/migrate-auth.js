const fs = require('fs');
const path = require('path');
const migrateProfiles = require('./migrate-profiles');
const migrateUsers = require('./migrate-users');
const { hashPassword } = require('./src/services/utils/password');

async function migrateAuth(client) {
  await migrateProfiles(client);
  await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '002_auth.sql'), 'utf8'));
  const { rows } = await client.query('SELECT id, password_hash FROM users');
  for (const user of rows) {
    // Respeta hashes anteriores; las contraseñas antiguas en texto plano se convierten.
    if (!/^\$(argon2(?:id|i|d)\$|2[aby]\$\d{2}\$)/.test(user.password_hash)) {
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2',
        [await hashPassword(user.password_hash), user.id]);
    }
  }
  await migrateUsers(client);
  await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '005_auth_logout.sql'), 'utf8'));
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
  const pool = require('./src/config/database');
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await migrateAuth(client);
    await client.query('COMMIT');
    console.log('Migración de autenticación y perfiles completada.');
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error durante la migración de autenticación:', error.message || error.code);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}
if (require.main === module) main();
module.exports = migrateAuth;
