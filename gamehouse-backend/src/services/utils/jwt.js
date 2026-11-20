const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

const secret = process.env.JWT_SECRET;
if (!secret || Buffer.byteLength(secret) < 32) {
  throw new Error('JWT_SECRET debe contener al menos 32 bytes aleatorios.');
}

const units = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
const parseDuration = (value, variable) => {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match || Number(match[1]) < 1) throw new Error(`${variable} debe ser una duración positiva con unidad: 30m, 1h, 7d.`);
  return Number(match[1]) * units[match[2]];
};

// Access token de vida corta (1 h) y refresh token de vida larga (7 días, caducidad absoluta de la sesión).
const accessTokenTtlMs = parseDuration(process.env.JWT_EXPIRES_IN || '1h', 'JWT_EXPIRES_IN');
const refreshTokenTtlMs = parseDuration(process.env.REFRESH_TOKEN_EXPIRES_IN || '7d', 'REFRESH_TOKEN_EXPIRES_IN');
const issuer = 'gamehouse';
const audience = 'gamehouse-api';
const options = { algorithms: ['HS256'], issuer, audience };

module.exports = {
  accessTokenTtlMs,
  refreshTokenTtlMs,
  // El payload solo identifica usuario (sub) y sesión (sid): ni rol, ni email, ni datos personales.
  // El rol se lee siempre de PostgreSQL. La caducidad nunca supera la de la sesión.
  signAccessToken: ({ userId, sessionId, sessionExpiresAt }) => {
    const expiresAt = Math.min(Date.now() + accessTokenTtlMs, new Date(sessionExpiresAt).getTime());
    const token = jwt.sign({ sid: sessionId }, secret, {
      algorithm: 'HS256', subject: userId, jwtid: randomUUID(),
      expiresIn: Math.max(1, Math.floor((expiresAt - Date.now()) / 1000)), issuer, audience,
    });
    return { token, expiresAt: new Date(jwt.decode(token).exp * 1000) };
  },
  verifyToken: (token) => jwt.verify(token, secret, options),
  // Solo para logout: identifica la sesión de un access token caducado pero con firma válida.
  verifyTokenIgnoringExpiration: (token) => jwt.verify(token, secret, { ...options, ignoreExpiration: true }),
};
