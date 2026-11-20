const pool = require('../config/database');
const { createHash, randomBytes, randomUUID } = require('crypto');

// Se guarda una huella del token, nunca la credencial reutilizable.
const fingerprint = (token) => createHash('sha256').update(token).digest('hex');
// 256 bits aleatorios: el refresh token es opaco, no un JWT, y no contiene ningún dato.
const generateToken = () => randomBytes(32).toString('base64url');

const toRefreshToken = (row) => row ? {
  id: row.id,
  sessionId: row.session_id,
  userId: row.user_id,
  expiresAt: row.expires_at,
  revokedAt: row.revoked_at,
  replacedBy: row.replaced_by,
} : null;

const insertToken = async (client, { sessionId, userId, expiresAt }) => {
  const token = generateToken();
  const { rows } = await client.query(
    `INSERT INTO refresh_tokens (session_id, user_id, token_hash, expires_at)
      VALUES ($1, $2, $3, $4) RETURNING id, expires_at`,
    [sessionId, userId, fingerprint(token), expiresAt],
  );
  return { id: rows[0].id, token, expiresAt: rows[0].expires_at };
};

module.exports = {
  /** Abre una sesión nueva y devuelve su primer refresh token. */
  createSession: async (userId, expiresAt, client = pool) => {
    // Las filas caducadas ya no protegen nada: se eliminan al iniciar sesión.
    await client.query('DELETE FROM refresh_tokens WHERE expires_at <= CURRENT_TIMESTAMP');
    const sessionId = randomUUID();
    return { sessionId, ...await insertToken(client, { sessionId, userId, expiresAt }) };
  },
  /** Bloquea la fila del token para que dos rotaciones simultáneas no lo usen a la vez. */
  findForUpdate: async (client, token) => toRefreshToken((await client.query(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE', [fingerprint(token)],
  )).rows[0]),
  findByToken: async (token, client = pool) => toRefreshToken((await client.query(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1', [fingerprint(token)],
  )).rows[0]),
  /** Sustituye el token usado por uno nuevo de la misma sesión, con la misma caducidad absoluta. */
  rotate: async (client, current) => {
    const next = await insertToken(client, current);
    await client.query(
      'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP, replaced_by = $2 WHERE id = $1',
      [current.id, next.id],
    );
    return next;
  },
  /** Una sesión está activa si conserva un refresh token sin revocar ni caducar. */
  isSessionActive: async (sessionId, userId) => (await pool.query(
    `SELECT 1 FROM refresh_tokens WHERE session_id = $1 AND user_id = $2
      AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP LIMIT 1`,
    [sessionId, userId],
  )).rowCount > 0,
  revokeSession: async (sessionId, client = pool) => {
    await client.query(
      'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE session_id = $1 AND revoked_at IS NULL',
      [sessionId],
    );
  },
  /** Cierra todas las sesiones del usuario (cambio de contraseña, desactivación o borrado). */
  revokeUserSessions: async (userId, client = pool) => {
    await client.query(
      'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL',
      [userId],
    );
  },
};
