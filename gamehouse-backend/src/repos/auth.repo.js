const pool = require('../config/database');
const { createHash } = require('crypto');

// Se guarda una huella del token, nunca la credencial reutilizable.
const fingerprint = (token) => createHash('sha256').update(token).digest('hex');

module.exports = {
  isTokenRevoked: async (token) => (await pool.query(
    'SELECT 1 FROM revoked_tokens WHERE token_hash = $1 AND expires_at > CURRENT_TIMESTAMP',
    [fingerprint(token)],
  )).rowCount > 0,
  revokeToken: async (token, expiresAt) => {
    await pool.query(
      'INSERT INTO revoked_tokens (token_hash, expires_at) VALUES ($1, $2) ON CONFLICT (token_hash) DO NOTHING',
      [fingerprint(token), expiresAt],
    );
    // Las revocaciones dejan de ser necesarias cuando el JWT ya ha caducado.
    await pool.query('DELETE FROM revoked_tokens WHERE expires_at <= CURRENT_TIMESTAMP');
  },
};
