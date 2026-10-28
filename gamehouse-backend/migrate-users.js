const fs = require('fs');
const path = require('path');

async function migrateUsers(client) {
  await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '004_user_lifecycle.sql'), 'utf8'));
  const schema = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
  const integrity = schema.split('-- BEGIN USER INTEGRITY')[1]?.split('-- END USER INTEGRITY')[0];
  if (!integrity) throw new Error('Falta la sección de integridad de usuarios.');
  await client.query(integrity);
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
  const pool = require('./src/config/database');
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await migrateUsers(client);
    await client.query('COMMIT');
    console.log('Migración de gestión de usuarios completada.');
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error de migración:', error.message || error.code);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}
if (require.main === module) main();
module.exports = migrateUsers;
