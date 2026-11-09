-- Índices de las consultas públicas del shop. Se ejecuta dentro de la transacción del migrador.
-- pg_trgm permite que la búsqueda ILIKE '%texto%' por nombre utilice un índice GIN.
-- Se cualifica con public para que funcione con cualquier search_path (por ejemplo, en las pruebas).
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- Experiencias visibles: orden por defecto (más recientes) y filtro por organizador.
CREATE INDEX IF NOT EXISTS experiences_shop_recent_idx ON experiences (created_at DESC, id DESC)
  WHERE deleted_at IS NULL AND is_active AND status = 'published';
CREATE INDEX IF NOT EXISTS experiences_shop_host_idx ON experiences (host_id)
  WHERE deleted_at IS NULL AND is_active AND status = 'published';
CREATE INDEX IF NOT EXISTS experiences_shop_name_trgm_idx ON experiences USING GIN (name public.gin_trgm_ops)
  WHERE deleted_at IS NULL AND is_active AND status = 'published';

-- La clave primaria empieza por experience_id; el filtro por categoría necesita el orden inverso.
CREATE INDEX IF NOT EXISTS experience_categories_category_idx ON experience_categories (category_id, experience_id)
  WHERE deleted_at IS NULL;

-- Salidas (departures) reservables: por experiencia y fecha, y por lugar.
CREATE INDEX IF NOT EXISTS events_departures_experience_idx ON events (experience_id, start_datetime)
  WHERE deleted_at IS NULL AND is_active AND status = 'scheduled';
CREATE INDEX IF NOT EXISTS events_departures_location_idx ON events (location_id, experience_id)
  WHERE deleted_at IS NULL AND is_active AND status = 'scheduled';
