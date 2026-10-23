-- Esquema para una base de datos PostgreSQL vacía.
-- Ejecuta después `npm seed` para cargar los datos de prueba.
-- experiences define el catálogo; events contiene cada celebración concreta.
BEGIN;

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  name VARCHAR(100) NOT NULL,
  surname VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE hosts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(180) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'published',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(30)
);
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255), -- nulo en lugares anteriores a esta migración
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20), -- nulo en lugares anteriores a esta migración
  country VARCHAR(100) NOT NULL,
  image_url TEXT,
  UNIQUE (name, city, country)
);
CREATE TABLE experiences (
  id SERIAL PRIMARY KEY,
  host_id INTEGER NOT NULL REFERENCES hosts(id),
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'published',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(180) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'published',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
CREATE TABLE experience_categories (
  experience_id INTEGER NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  PRIMARY KEY (experience_id, category_id)
);
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(180) NOT NULL UNIQUE,
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
-- Los borradores importados conservan precio, capacidad y duración sin inventar fechas.
CREATE UNIQUE INDEX events_unique_schedule ON events (experience_id, location_id, start_datetime)
  WHERE start_datetime IS NOT NULL;
CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(100) NOT NULL CHECK (entity_type ~ '^[a-z][a-z0-9_]*$'),
  entity_id INTEGER NOT NULL CHECK (entity_id > 0),
  url TEXT NOT NULL CHECK (length(trim(url)) > 0),
  is_main BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (entity_type, entity_id, position)
);
CREATE UNIQUE INDEX images_one_main_per_entity ON images (entity_type, entity_id) WHERE is_main;
CREATE INDEX images_entity_lookup ON images (entity_type, entity_id, position);

CREATE FUNCTION sync_catalog_image() RETURNS trigger AS $$
BEGIN
  DELETE FROM images WHERE entity_type = TG_TABLE_NAME AND entity_id = NEW.id AND is_main = TRUE;
  IF NEW.image_url IS NOT NULL AND trim(NEW.image_url) <> '' THEN
    INSERT INTO images (entity_type, entity_id, url, is_main, position)
      VALUES (TG_TABLE_NAME, NEW.id, NEW.image_url, TRUE, 0)
      ON CONFLICT (entity_type, entity_id, position)
      DO UPDATE SET url = EXCLUDED.url, is_main = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER hosts_sync_image AFTER INSERT OR UPDATE OF image_url ON hosts
  FOR EACH ROW EXECUTE FUNCTION sync_catalog_image();
CREATE TRIGGER locations_sync_image AFTER INSERT OR UPDATE OF image_url ON locations
  FOR EACH ROW EXECUTE FUNCTION sync_catalog_image();
CREATE TRIGGER experiences_sync_catalog_image AFTER INSERT OR UPDATE OF image_url ON experiences
  FOR EACH ROW EXECUTE FUNCTION sync_catalog_image();
CREATE TRIGGER categories_sync_image AFTER INSERT OR UPDATE OF image_url ON categories
  FOR EACH ROW EXECUTE FUNCTION sync_catalog_image();
CREATE TRIGGER events_sync_image AFTER INSERT OR UPDATE OF image_url ON events
  FOR EACH ROW EXECUTE FUNCTION sync_catalog_image();
COMMIT;
