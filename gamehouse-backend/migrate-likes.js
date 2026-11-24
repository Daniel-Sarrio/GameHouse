const fs = require('fs');
const path = require('path');

async function migrateLikes(client) {
  await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '009_experience_likes.sql'), 'utf8'));
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
  const pool = require('./src/config/database');
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await migrateLikes(client);
    await client.query('COMMIT');
    console.log('Migración de likes completada.');
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
module.exports = migrateLikes;
