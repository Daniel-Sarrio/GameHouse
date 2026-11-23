-- Comentarios con valoración de 1 a 5 estrellas en el detalle de una experiencia.
-- Un usuario puede dejar varios comentarios en la misma experiencia. No se editan; el borrado es lógico.
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  experience_id INTEGER NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CONSTRAINT comments_rating_range CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL CONSTRAINT comments_body_length CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);
-- Listado público: comentarios visibles de una experiencia, los más recientes primero.
CREATE INDEX IF NOT EXISTS comments_experience_idx ON comments (experience_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS comments_user_idx ON comments (user_id);
