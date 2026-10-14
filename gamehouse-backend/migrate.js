require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = require('./src/config/database');
const generateSlug = require('./src/services/utils/slug');

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE experiences
        ADD COLUMN IF NOT EXISTS slug VARCHAR(180),
        ADD COLUMN IF NOT EXISTS location VARCHAR(150) NOT NULL DEFAULT 'GameHouse',
        ADD COLUMN IF NOT EXISTS country VARCHAR(100) NOT NULL DEFAULT 'España',
        ADD COLUMN IF NOT EXISTS city VARCHAR(100) NOT NULL DEFAULT 'Valencia',
        ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
        ADD COLUMN IF NOT EXISTS cover_image TEXT NOT NULL DEFAULT 'https://picsum.photos/seed/gamehouse/1200/800',
        ADD COLUMN IF NOT EXISTS gallery TEXT[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS host_name VARCHAR(100) NOT NULL DEFAULT 'GameHouse',
        ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'published',
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
    `);

    const { rows } = await client.query('SELECT id, name, slug FROM experiences ORDER BY id');
    const used = new Set(rows.filter((row) => row.slug).map((row) => row.slug));

    for (const row of rows) {
      if (row.slug) continue;
      const base = generateSlug(row.name) || `experiencia-${row.id}`;
      let slug = base;
      let suffix = 2;
      while (used.has(slug)) slug = `${base}-${suffix++}`;
      used.add(slug);
      await client.query('UPDATE experiences SET slug = $1 WHERE id = $2', [slug, row.id]);
    }

    await client.query('ALTER TABLE experiences ALTER COLUMN slug SET NOT NULL');
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS experiences_slug_unique ON experiences (slug)');
    await client.query('COMMIT');
    console.log('Migración de experiences completada.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error durante la migración:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
