-- Sesiones con refresh token rotatorio. Se guarda solo la huella SHA-256 del token, nunca el token.
-- Todas las rotaciones de un mismo login comparten session_id y la caducidad absoluta (7 días).
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ,
  -- Token que lo sustituyó al rotar; NULL si se revocó por logout o por reutilización.
  replaced_by UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS refresh_tokens_session_idx ON refresh_tokens (session_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_expires_at_idx ON refresh_tokens (expires_at);

-- El access token se invalida revocando su sesión: la lista de JWT revocados ya no es necesaria.
DROP TABLE IF EXISTS revoked_tokens;
