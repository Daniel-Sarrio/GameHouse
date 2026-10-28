-- Esquema para una base de datos PostgreSQL vacía.
-- Ejecuta después `npm seed` para cargar los datos de prueba.
-- experiences define el catálogo; events contiene cada celebración concreta.
BEGIN;

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  name VARCHAR(50) NOT NULL UNIQUE,
  CONSTRAINT roles_allowed_name CHECK (name IN ('USER', 'ADMIN', 'HOST'))
);
INSERT INTO roles (name) VALUES ('USER'), ('ADMIN');
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'USER' CONSTRAINT users_allowed_role CHECK (role IN ('USER', 'ADMIN')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX users_email_ci_unique ON users (lower(email));
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(30),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE hosts (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(id),
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
  deleted_at TIMESTAMPTZ,
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
  deleted_at TIMESTAMPTZ,
  experience_id INTEGER NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  PRIMARY KEY (experience_id, category_id)
);
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  deleted_at TIMESTAMPTZ,
  sku VARCHAR(180) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
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
-- BEGIN ACTIVITY INTEGRITY
-- Esta sección también la aplica migrate.js a las bases de datos existentes.
-- La desactivación conserva los registros y se ejecuta dentro de la misma transacción.

CREATE OR REPLACE FUNCTION enforce_catalog_activity() RETURNS trigger AS $$
DECLARE
  organizer hosts%ROWTYPE;
BEGIN
  -- Archivado, suspendido o eliminado siempre significa desactivado.
  IF NEW.deleted_at IS NOT NULL OR NEW.status IN ('archived', 'suspended') THEN
    NEW.is_active := FALSE;
  END IF;
  IF TG_TABLE_NAME = 'experiences' AND NEW.is_active THEN
    SELECT * INTO organizer FROM hosts WHERE id = NEW.host_id FOR SHARE;
    IF NOT FOUND OR NOT organizer.is_active OR organizer.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'No se puede activar una experiencia con un organizador desactivado o eliminado.'
        USING ERRCODE = '23514', CONSTRAINT = 'experience_active_host';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cascade_catalog_deactivation() RETURNS trigger AS $$
BEGIN
  IF NEW.is_active AND NEW.deleted_at IS NULL THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'hosts' THEN
    -- Organizador -> experiencias -> eventos (el siguiente trigger continúa la cascada).
    UPDATE experiences SET is_active = FALSE,
      status = CASE WHEN deleted_at IS NULL THEN 'suspended' ELSE status END,
      updated_at = CURRENT_TIMESTAMP
      WHERE host_id = NEW.id AND is_active;
  ELSIF TG_TABLE_NAME = 'experiences' THEN
    UPDATE events SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE experience_id = NEW.id AND is_active;
  ELSIF TG_TABLE_NAME = 'categories' THEN
    -- Solo afecta a los eventos que usan esta categoría concreta.
    UPDATE events SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE category_id = NEW.id AND is_active;
  END IF;
  -- Activar un padre nunca reactiva automáticamente a sus dependientes.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_event_activity() RETURNS trigger AS $$
DECLARE
  activity RECORD;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN NEW.is_active := FALSE; END IF;
  IF NOT NEW.is_active THEN RETURN NEW; END IF;
  -- FOR SHARE impide activar/crear un evento mientras se desactiva alguno de sus padres.
  SELECT e.is_active AS experience_active, e.deleted_at AS experience_deleted,
    h.is_active AS host_active, h.deleted_at AS host_deleted,
    c.is_active AS category_active, c.deleted_at AS category_deleted, l.deleted_at AS location_deleted
    INTO activity
    FROM experiences e JOIN hosts h ON h.id = e.host_id
    CROSS JOIN categories c CROSS JOIN locations l
    WHERE e.id = NEW.experience_id AND c.id = NEW.category_id AND l.id = NEW.location_id
    FOR SHARE OF e, h, c, l;
  IF NOT FOUND OR NOT activity.experience_active OR activity.experience_deleted IS NOT NULL
    OR NOT activity.host_active OR activity.host_deleted IS NOT NULL
    OR NOT activity.category_active OR activity.category_deleted IS NOT NULL OR activity.location_deleted IS NOT NULL THEN
    RAISE EXCEPTION 'No se puede activar un evento: su experiencia, organizador o categoría está desactivado o eliminado.'
      USING ERRCODE = '23514', CONSTRAINT = 'event_active_dependencies';
  END IF;
  PERFORM 1 FROM experience_categories
    WHERE experience_id = NEW.experience_id AND category_id = NEW.category_id AND deleted_at IS NULL FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se puede activar un evento con una categoría que ya no pertenece a su experiencia.'
      USING ERRCODE = '23514', CONSTRAINT = 'event_active_category_assignment';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION deactivate_unassigned_events() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.experience_id = OLD.experience_id AND NEW.category_id = OLD.category_id AND NEW.deleted_at IS NULL THEN RETURN NEW; END IF;
  END IF;
  -- Quitar/cambiar una asignación no puede dejar activo un evento sin esa relación.
  UPDATE events SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
    WHERE experience_id = OLD.experience_id AND category_id = OLD.category_id AND is_active;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hosts_enforce_activity ON hosts;
CREATE OR REPLACE FUNCTION deactivate_location_events() RETURNS trigger AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    UPDATE events SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE location_id = NEW.id AND is_active;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS locations_cascade_deactivation ON locations;
CREATE TRIGGER locations_cascade_deactivation AFTER UPDATE OF deleted_at ON locations
  FOR EACH ROW EXECUTE FUNCTION deactivate_location_events();
CREATE TRIGGER hosts_enforce_activity BEFORE INSERT OR UPDATE ON hosts
  FOR EACH ROW EXECUTE FUNCTION enforce_catalog_activity();
DROP TRIGGER IF EXISTS categories_enforce_activity ON categories;
CREATE TRIGGER categories_enforce_activity BEFORE INSERT OR UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION enforce_catalog_activity();
DROP TRIGGER IF EXISTS experiences_enforce_activity ON experiences;
CREATE TRIGGER experiences_enforce_activity BEFORE INSERT OR UPDATE ON experiences
  FOR EACH ROW EXECUTE FUNCTION enforce_catalog_activity();
DROP TRIGGER IF EXISTS hosts_cascade_deactivation ON hosts;
CREATE TRIGGER hosts_cascade_deactivation AFTER UPDATE OF is_active, status, deleted_at ON hosts
  FOR EACH ROW EXECUTE FUNCTION cascade_catalog_deactivation();
DROP TRIGGER IF EXISTS categories_cascade_deactivation ON categories;
CREATE TRIGGER categories_cascade_deactivation AFTER UPDATE OF is_active, status, deleted_at ON categories
  FOR EACH ROW EXECUTE FUNCTION cascade_catalog_deactivation();
DROP TRIGGER IF EXISTS experiences_cascade_deactivation ON experiences;
CREATE TRIGGER experiences_cascade_deactivation AFTER UPDATE OF is_active, status, deleted_at ON experiences
  FOR EACH ROW EXECUTE FUNCTION cascade_catalog_deactivation();
DROP TRIGGER IF EXISTS events_enforce_activity ON events;
CREATE TRIGGER events_enforce_activity BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION enforce_event_activity();
DROP TRIGGER IF EXISTS assignments_cascade_deactivation ON experience_categories;
CREATE TRIGGER assignments_cascade_deactivation AFTER DELETE OR UPDATE ON experience_categories
  FOR EACH ROW EXECUTE FUNCTION deactivate_unassigned_events();
-- END ACTIVITY INTEGRITY
-- BEGIN USER INTEGRITY
CREATE OR REPLACE FUNCTION enforce_user_lifecycle() RETURNS trigger AS $$
BEGIN
  IF OLD.deleted_at IS NOT NULL THEN
    NEW.deleted_at := OLD.deleted_at;
    NEW.is_active := FALSE;
  END IF;
  IF NEW.deleted_at IS NOT NULL THEN
    NEW.is_active := FALSE;
    IF EXISTS (SELECT 1 FROM hosts WHERE user_id = NEW.id AND deleted_at IS NULL) THEN
      RAISE EXCEPTION 'No se puede eliminar: el usuario gestiona organizadores.'
        USING ERRCODE = '23514', CONSTRAINT = 'user_has_hosts';
    END IF;
  ELSIF NOT NEW.is_active AND EXISTS (
    SELECT 1 FROM hosts WHERE user_id = NEW.id AND is_active AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'No se puede desactivar: el usuario gestiona organizadores activos.'
      USING ERRCODE = '23514', CONSTRAINT = 'user_has_active_hosts';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_host_user() RETURNS trigger AS $$
DECLARE owner RECORD;
BEGIN
  IF NEW.user_id IS NULL OR NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  SELECT is_active, deleted_at INTO owner FROM users WHERE id = NEW.user_id FOR SHARE;
  IF NOT FOUND OR owner.deleted_at IS NOT NULL OR (NEW.is_active AND NOT owner.is_active) THEN
    RAISE EXCEPTION 'El organizador necesita un usuario existente; si está activo, su usuario también debe estarlo.'
      USING ERRCODE = '23514', CONSTRAINT = 'host_valid_user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION protect_used_roles() RETURNS trigger AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN NEW.is_active := FALSE; END IF;
  IF (NEW.name <> OLD.name OR NEW.deleted_at IS NOT NULL) AND EXISTS (
    SELECT 1 FROM users WHERE role = OLD.name AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'No se puede renombrar o eliminar un rol con usuarios no eliminados.'
      USING ERRCODE = '23514', CONSTRAINT = 'role_has_users';
  END IF;
  IF NOT NEW.is_active AND EXISTS (
    SELECT 1 FROM users WHERE role = OLD.name AND is_active AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'No se puede desactivar un rol con usuarios activos.'
      USING ERRCODE = '23514', CONSTRAINT = 'role_has_active_users';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_enforce_lifecycle ON users;
CREATE TRIGGER users_enforce_lifecycle BEFORE UPDATE OF is_active, deleted_at ON users
  FOR EACH ROW EXECUTE FUNCTION enforce_user_lifecycle();
DROP TRIGGER IF EXISTS hosts_enforce_user ON hosts;
CREATE TRIGGER hosts_enforce_user BEFORE INSERT OR UPDATE OF user_id, is_active, deleted_at ON hosts
  FOR EACH ROW EXECUTE FUNCTION enforce_host_user();
DROP TRIGGER IF EXISTS roles_protect_users ON roles;
CREATE TRIGGER roles_protect_users BEFORE UPDATE OF name, is_active, deleted_at ON roles
  FOR EACH ROW EXECUTE FUNCTION protect_used_roles();
-- END USER INTEGRITY
COMMIT;
