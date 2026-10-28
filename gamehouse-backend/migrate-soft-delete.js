const fs = require('fs');
const path = require('path');

async function migrateSoftDelete(client) {
  await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '003_soft_delete.sql'), 'utf8'));
  const schema = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
  const activitySql = schema.split('-- BEGIN ACTIVITY INTEGRITY')[1]?.split('-- END ACTIVITY INTEGRITY')[0];
  if (!activitySql) throw new Error('Falta la sección de integridad asociativa.');
  await client.query(activitySql);
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
  const pool = require('./src/config/database');
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await migrateSoftDelete(client);
    await client.query('COMMIT');
    console.log('Migración de borrado lógico completada.');
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
module.exports = migrateSoftDelete;
