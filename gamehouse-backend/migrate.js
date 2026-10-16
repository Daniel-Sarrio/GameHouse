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
    await client.query(`
      CREATE TABLE IF NOT EXISTS hosts (
        id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE
      );
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY, name VARCHAR(150) NOT NULL,
        city VARCHAR(100) NOT NULL, country VARCHAR(100) NOT NULL,
        image_url TEXT,
        UNIQUE (name, city, country)
      );
      ALTER TABLE locations ADD COLUMN IF NOT EXISTS image_url TEXT;
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE
      );
      CREATE TABLE IF NOT EXISTS experience_categories (
        experience_id INTEGER NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        PRIMARY KEY (experience_id, category_id)
      );
      ALTER TABLE experiences
        ADD COLUMN IF NOT EXISTS host_id INTEGER REFERENCES hosts(id),
        ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);
      INSERT INTO hosts (name)
        SELECT DISTINCT host_name FROM experiences WHERE host_name IS NOT NULL
        ON CONFLICT (name) DO NOTHING;
      INSERT INTO locations (name, city, country)
        SELECT DISTINCT location, city, country FROM experiences
        WHERE location IS NOT NULL AND city IS NOT NULL AND country IS NOT NULL
        ON CONFLICT (name, city, country) DO NOTHING;
      UPDATE experiences e SET host_id = h.id FROM hosts h
        WHERE e.host_id IS NULL AND e.host_name = h.name;
      UPDATE experiences e SET location_id = l.id FROM locations l
        WHERE e.location_id IS NULL AND e.location = l.name
          AND e.city = l.city AND e.country = l.country;
      INSERT INTO categories (name) VALUES
        ('Torneos'), ('Realidad Virtual'), ('Simuladores'), ('Gaming'), ('Escape Rooms')
        ON CONFLICT (name) DO NOTHING;
      INSERT INTO experience_categories (experience_id, category_id)
        SELECT e.id, c.id FROM experiences e JOIN categories c ON c.name =
          CASE WHEN e.name ILIKE '%torneo%' THEN 'Torneos'
               WHEN e.name ILIKE '%realidad virtual%' THEN 'Realidad Virtual'
               ELSE 'Gaming' END
        WHERE NOT EXISTS (SELECT 1 FROM experience_categories ec WHERE ec.experience_id = e.id)
        ON CONFLICT DO NOTHING;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(100) NOT NULL CHECK (entity_type ~ '^[a-z][a-z0-9_]*$'),
        entity_id INTEGER NOT NULL CHECK (entity_id > 0),
        url TEXT NOT NULL CHECK (length(trim(url)) > 0),
        is_main BOOLEAN NOT NULL DEFAULT FALSE,
        position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (entity_type, entity_id, position)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS images_one_main_per_entity
        ON images (entity_type, entity_id) WHERE is_main;
      CREATE INDEX IF NOT EXISTS images_entity_lookup
        ON images (entity_type, entity_id, position);

      UPDATE locations l SET image_url = i.url FROM images i
        WHERE i.entity_type = 'locations' AND i.entity_id = l.id
          AND i.is_main = TRUE AND l.image_url IS NULL;

      INSERT INTO images (entity_type, entity_id, url, is_main, position)
        SELECT 'experiences', e.id, e.cover_image, TRUE, 0
        FROM experiences e
        WHERE e.cover_image IS NOT NULL AND trim(e.cover_image) <> ''
          AND NOT EXISTS (SELECT 1 FROM images i WHERE i.entity_type = 'experiences' AND i.entity_id = e.id)
        ON CONFLICT (entity_type, entity_id, position) DO NOTHING;
      INSERT INTO images (entity_type, entity_id, url, is_main, position)
        SELECT 'experiences', e.id, g.url, FALSE, g.ordinality::integer
        FROM experiences e
        CROSS JOIN LATERAL unnest(e.gallery) WITH ORDINALITY AS g(url, ordinality)
        WHERE g.url IS NOT NULL AND trim(g.url) <> ''
        ON CONFLICT (entity_type, entity_id, position) DO NOTHING;

      CREATE OR REPLACE FUNCTION sync_experience_images() RETURNS trigger AS $$
      BEGIN
        DELETE FROM images WHERE entity_type = 'experiences' AND entity_id = NEW.id;
        IF NEW.cover_image IS NOT NULL AND trim(NEW.cover_image) <> '' THEN
          INSERT INTO images (entity_type, entity_id, url, is_main, position)
            VALUES ('experiences', NEW.id, NEW.cover_image, TRUE, 0);
        END IF;
        INSERT INTO images (entity_type, entity_id, url, is_main, position)
          SELECT 'experiences', NEW.id, g.url, FALSE, g.ordinality::integer
          FROM unnest(NEW.gallery) WITH ORDINALITY AS g(url, ordinality)
          WHERE g.url IS NOT NULL AND trim(g.url) <> '';
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS experiences_sync_images ON experiences;
      CREATE TRIGGER experiences_sync_images
        AFTER INSERT OR UPDATE OF cover_image, gallery ON experiences
        FOR EACH ROW EXECUTE FUNCTION sync_experience_images();

      CREATE OR REPLACE FUNCTION sync_location_image() RETURNS trigger AS $$
      BEGIN
        DELETE FROM images WHERE entity_type = 'locations'
          AND entity_id = NEW.id AND is_main = TRUE;
        IF NEW.image_url IS NOT NULL AND trim(NEW.image_url) <> '' THEN
          INSERT INTO images (entity_type, entity_id, url, is_main, position)
            VALUES ('locations', NEW.id, NEW.image_url, TRUE, 0)
            ON CONFLICT (entity_type, entity_id, position)
            DO UPDATE SET url = EXCLUDED.url, is_main = TRUE;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS locations_sync_image ON locations;
      CREATE TRIGGER locations_sync_image
        AFTER INSERT OR UPDATE OF image_url ON locations
        FOR EACH ROW EXECUTE FUNCTION sync_location_image();
    `);
    await client.query(`
      DO $$
      BEGIN
        IF to_regclass('public.event_images') IS NOT NULL THEN
          INSERT INTO images (entity_type, entity_id, url, is_main, position)
            SELECT 'events', event_id, url, is_main, position FROM event_images
            ON CONFLICT (entity_type, entity_id, position) DO NOTHING;
        END IF;
      END;
      $$;
    `);
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
