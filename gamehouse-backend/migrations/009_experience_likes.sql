-- Likes de usuarios a experiencias. La clave primaria impide que un usuario dé like dos veces
-- a la misma experiencia, también con peticiones simultáneas. Quitar el like borra la fila.
CREATE TABLE IF NOT EXISTS experience_likes (
  experience_id INTEGER NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (experience_id, user_id)
);
-- La clave primaria cubre el contador por experiencia; este índice cubre "mis likes".
CREATE INDEX IF NOT EXISTS experience_likes_user_idx ON experience_likes (user_id, created_at DESC);
