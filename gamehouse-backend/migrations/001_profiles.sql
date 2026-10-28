-- Se ejecuta dentro de la transacción del migrador.
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(30),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Conserva los datos antiguos y no sobrescribe los perfiles ya editados.
INSERT INTO profiles (user_id, first_name, last_name, phone, created_at)
SELECT id, name, surname, phone, created_at FROM users
ON CONFLICT (user_id) DO NOTHING;
