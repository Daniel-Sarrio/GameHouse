-- migrate-auth.js ejecuta esta migración y el hashing dentro de una transacción.
DO $$
DECLARE
  fk RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'id' AND data_type = 'integer') THEN
    -- Una referencia desconocida requiere adaptar la migración, nunca eliminarla con CASCADE.
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = 'users'::regclass
      AND conrelid NOT IN ('hosts'::regclass, 'profiles'::regclass)) THEN
      RAISE EXCEPTION 'Hay referencias adicionales a users. Adapta la migración antes de continuar.';
    END IF;
    ALTER TABLE users ADD COLUMN uuid_id UUID NOT NULL DEFAULT gen_random_uuid();
    ALTER TABLE hosts ADD COLUMN uuid_user_id UUID;
    ALTER TABLE profiles ADD COLUMN uuid_user_id UUID;
    UPDATE hosts h SET uuid_user_id = u.uuid_id FROM users u WHERE h.user_id = u.id;
    UPDATE profiles p SET uuid_user_id = u.uuid_id FROM users u WHERE p.user_id = u.id;

    FOR fk IN SELECT conrelid::regclass AS tbl, conname FROM pg_constraint
      WHERE contype = 'f' AND confrelid = 'users'::regclass LOOP
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', fk.tbl, fk.conname);
    END LOOP;
    ALTER TABLE hosts ALTER COLUMN user_id TYPE UUID USING uuid_user_id;
    ALTER TABLE profiles ALTER COLUMN user_id TYPE UUID USING uuid_user_id;
    ALTER TABLE hosts DROP COLUMN uuid_user_id;
    ALTER TABLE profiles DROP COLUMN uuid_user_id;
    FOR fk IN SELECT conname FROM pg_constraint WHERE contype = 'p' AND conrelid = 'users'::regclass LOOP
      EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', fk.conname);
    END LOOP;
    ALTER TABLE users RENAME COLUMN id TO legacy_id;
    ALTER TABLE users ADD UNIQUE (legacy_id);
    ALTER TABLE users RENAME COLUMN uuid_id TO id;
    ALTER TABLE users ADD PRIMARY KEY (id);
    ALTER TABLE hosts ADD CONSTRAINT hosts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
    ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

    ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER'
      CONSTRAINT users_allowed_role CHECK (role IN ('USER', 'ADMIN'));
    UPDATE users u SET role = CASE WHEN r.name = 'ADMIN' THEN 'ADMIN' ELSE 'USER' END
      FROM roles r WHERE u.role_id = r.id;
    -- Conserva el antiguo rol de catálogo para trazabilidad, sin usarlo como permiso.
    ALTER TABLE users RENAME COLUMN role_id TO legacy_role_id;
    ALTER TABLE users ALTER COLUMN legacy_role_id DROP NOT NULL;
    ALTER TABLE users RENAME COLUMN password TO password_hash;
    ALTER TABLE users ALTER COLUMN password_hash TYPE TEXT;
    ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
    -- 001_profiles.sql ha trasladado previamente los datos de negocio.
    ALTER TABLE users DROP COLUMN name, DROP COLUMN surname, DROP COLUMN phone;
  END IF;
END;
$$;

-- Una colisión de correos antiguos cancela toda la migración para revisión manual.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_ci_unique ON users (lower(email));
