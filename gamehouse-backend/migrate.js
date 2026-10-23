require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = require('./src/config/database');
const generateSlug = require('./src/services/utils/slug');
const generateSku = require('./src/services/utils/sku');

async function migrateEventSkus(client) {
  await client.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS sku VARCHAR(180)');
  const { rows } = await client.query(`SELECT ev.id, ev.sku, e.name
    FROM events ev JOIN experiences e ON e.id = ev.experience_id ORDER BY ev.id`);
  const used = new Set(rows.filter((row) => row.sku).map((row) => row.sku));
  // Se rellenan los eventos anteriores antes de exigir NOT NULL y UNIQUE.
  for (const row of rows) {
    if (row.sku) continue;
    const base = generateSku(row.name) || 'EVENTO';
    let sku = base;
    let suffix = 2;
    while (used.has(sku)) {
      const ending = `-${suffix++}`;
      sku = `${base.slice(0, 180 - ending.length)}${ending}`;
    }
    used.add(sku);
    await client.query('UPDATE events SET sku = $1 WHERE id = $2', [sku, row.id]);
  }
  await client.query('ALTER TABLE events ALTER COLUMN sku SET NOT NULL');
  const constraint = await client.query(`SELECT 1 FROM pg_constraint
    WHERE conrelid = 'events'::regclass AND conname = 'events_sku_key'`);
  if (!constraint.rowCount) await client.query('ALTER TABLE events ADD CONSTRAINT events_sku_key UNIQUE (sku)');
}

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const currentSchema = await client.query(`SELECT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events'
    ) AS has_events`);
    if (currentSchema.rows[0].has_events) {
      await client.query('ALTER TABLE experiences ALTER COLUMN host_id SET NOT NULL');
      await migrateEventSkus(client);
      await client.query('COMMIT');
      console.log('Migración aplicada: events.sku VARCHAR(180) NOT NULL UNIQUE.');
      return;
    }
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
      ALTER TABLE hosts ADD COLUMN IF NOT EXISTS slug VARCHAR(180);
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
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug VARCHAR(180);
      CREATE TABLE IF NOT EXISTS experience_categories (
        experience_id INTEGER NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        PRIMARY KEY (experience_id, category_id)
      );
      ALTER TABLE experiences
        ADD COLUMN IF NOT EXISTS host_id INTEGER REFERENCES hosts(id),
        ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);
      INSERT INTO hosts (name, slug)
        SELECT DISTINCT host_name, 'host-' || md5(host_name) FROM experiences WHERE host_name IS NOT NULL
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
      INSERT INTO categories (name, slug) VALUES
        ('Torneos', 'torneos'), ('Realidad Virtual', 'realidad-virtual'),
        ('Simuladores', 'simuladores'), ('Gaming', 'gaming'), ('Escape Rooms', 'escape-rooms')
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
    for (const table of ['categories', 'hosts']) {
      await client.query(`ALTER TABLE ${table}
        ADD COLUMN IF NOT EXISTS slug VARCHAR(180),
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS image_url TEXT,
        ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'published',
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL`);
      const existing = await client.query(`SELECT id, name, slug FROM ${table} ORDER BY id`);
      const generatedHostSlug = (slug) => table === 'hosts' && /^host-[a-f0-9]{32}$/.test(slug || '');
      const slugs = new Set(existing.rows.filter((row) => row.slug && !generatedHostSlug(row.slug)).map((row) => row.slug));
      for (const row of existing.rows) {
        if (row.slug && !generatedHostSlug(row.slug)) continue;
        const base = generateSlug(row.name) || `${table}-${row.id}`;
        let slug = base;
        let suffix = 2;
        while (slugs.has(slug)) slug = `${base}-${suffix++}`;
        slugs.add(slug);
        await client.query(`UPDATE ${table} SET slug = $1 WHERE id = $2`, [slug, row.id]);
      }
      await client.query(`ALTER TABLE ${table} ALTER COLUMN slug SET NOT NULL`);
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS ${table}_slug_unique ON ${table} (slug)`);
      await client.query(`UPDATE ${table} entity SET image_url = image.url FROM images image
        WHERE image.entity_type = $1 AND image.entity_id = entity.id
          AND image.is_main = TRUE AND entity.image_url IS NULL`, [table]);
    }
    await client.query(`ALTER TABLE hosts
      ADD COLUMN IF NOT EXISTS email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(30)`);
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS hosts_email_unique ON hosts (email) WHERE email IS NOT NULL');
    await client.query(`
      CREATE OR REPLACE FUNCTION sync_catalog_image() RETURNS trigger AS $$
      BEGIN
        DELETE FROM images WHERE entity_type = TG_TABLE_NAME
          AND entity_id = NEW.id AND is_main = TRUE;
        IF NEW.image_url IS NOT NULL AND trim(NEW.image_url) <> '' THEN
          INSERT INTO images (entity_type, entity_id, url, is_main, position)
            VALUES (TG_TABLE_NAME, NEW.id, NEW.image_url, TRUE, 0)
            ON CONFLICT (entity_type, entity_id, position)
            DO UPDATE SET url = EXCLUDED.url, is_main = TRUE;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS categories_sync_image ON categories;
      CREATE TRIGGER categories_sync_image
        AFTER INSERT OR UPDATE OF image_url ON categories
        FOR EACH ROW EXECUTE FUNCTION sync_catalog_image();
      DROP TRIGGER IF EXISTS hosts_sync_image ON hosts;
      CREATE TRIGGER hosts_sync_image
        AFTER INSERT OR UPDATE OF image_url ON hosts
        FOR EACH ROW EXECUTE FUNCTION sync_catalog_image();
    `);
    await client.query(`CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE
    )`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        role_id INTEGER NOT NULL REFERENCES roles(id),
        name VARCHAR(100) NOT NULL,
        surname VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(30),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE hosts ADD COLUMN IF NOT EXISTS user_id INTEGER UNIQUE REFERENCES users(id);
      ALTER TABLE locations
        ADD COLUMN IF NOT EXISTS address VARCHAR(255),
        ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
      ALTER TABLE experiences ADD COLUMN IF NOT EXISTS image_url TEXT;
      UPDATE experiences SET image_url = cover_image WHERE image_url IS NULL;
      ALTER TABLE experiences ALTER COLUMN host_id SET NOT NULL;
      CREATE TABLE events (
        id SERIAL PRIMARY KEY,
        experience_id INTEGER NOT NULL REFERENCES experiences(id),
        location_id INTEGER NOT NULL REFERENCES locations(id),
        category_id INTEGER NOT NULL REFERENCES categories(id),
        start_datetime TIMESTAMP,
        end_datetime TIMESTAMP,
        price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
        capacity INTEGER NOT NULL CHECK (capacity > 0),
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        image_url TEXT,
        duration_minutes INTEGER CHECK (duration_minutes > 0),
        legacy_experience_id INTEGER UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT events_dates_together CHECK ((start_datetime IS NULL) = (end_datetime IS NULL)),
        CONSTRAINT events_end_after_start CHECK (end_datetime IS NULL OR end_datetime > start_datetime)
      );
      CREATE UNIQUE INDEX events_unique_schedule ON events (experience_id, location_id, start_datetime)
        WHERE start_datetime IS NOT NULL;
      INSERT INTO events (experience_id, location_id, category_id, price, capacity,
        status, image_url, duration_minutes, legacy_experience_id, created_at, updated_at)
      SELECT e.id, e.location_id,
        (SELECT ec.category_id FROM experience_categories ec WHERE ec.experience_id = e.id ORDER BY ec.category_id LIMIT 1),
        e.price, e.capacity, 'draft', e.cover_image, e.duration, e.id, e.created_at, e.updated_at
      FROM experiences e
      WHERE e.location_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM experience_categories ec WHERE ec.experience_id = e.id);
      INSERT INTO images (entity_type, entity_id, url, is_main, position)
      SELECT 'events', ev.id, i.url, i.is_main, i.position
      FROM events ev JOIN images i ON i.entity_type = 'experiences'
        AND i.entity_id = ev.legacy_experience_id
      ON CONFLICT (entity_type, entity_id, position) DO NOTHING;
      DROP TRIGGER IF EXISTS experiences_sync_images ON experiences;
      ALTER TABLE experiences
        DROP COLUMN price, DROP COLUMN duration, DROP COLUMN capacity,
        DROP COLUMN location, DROP COLUMN country, DROP COLUMN city,
        DROP COLUMN currency, DROP COLUMN cover_image, DROP COLUMN gallery,
        DROP COLUMN host_name, DROP COLUMN location_id;
      DROP FUNCTION IF EXISTS sync_experience_images();
      DROP TRIGGER IF EXISTS experiences_sync_catalog_image ON experiences;
      CREATE TRIGGER experiences_sync_catalog_image
        AFTER INSERT OR UPDATE OF image_url ON experiences
        FOR EACH ROW EXECUTE FUNCTION sync_catalog_image();
      DROP TRIGGER IF EXISTS events_sync_image ON events;
      CREATE TRIGGER events_sync_image
        AFTER INSERT OR UPDATE OF image_url ON events
        FOR EACH ROW EXECUTE FUNCTION sync_catalog_image();
    `);
    await migrateEventSkus(client);
    await client.query('COMMIT');
    console.log('Migración de experiences y events completada.');
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
