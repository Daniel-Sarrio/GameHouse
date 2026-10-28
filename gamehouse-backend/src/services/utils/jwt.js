const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;
if (!secret || Buffer.byteLength(secret) < 32) {
  throw new Error('JWT_SECRET debe contener al menos 32 bytes aleatorios.');
}
const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
if (!/^\d+(s|m|h|d)$/.test(expiresIn) || parseInt(expiresIn, 10) < 1) {
  throw new Error('JWT_EXPIRES_IN debe ser una duración positiva con unidad: 30m, 1h, 7d.');
}
const issuer = 'gamehouse';
const audience = 'gamehouse-api';

module.exports = {
  signToken: (user) => jwt.sign({}, secret, {
    algorithm: 'HS256', subject: user.id, expiresIn, issuer, audience,
  }),
  verifyToken: (token) => jwt.verify(token, secret, {
    algorithms: ['HS256'], issuer, audience,
  }),
};
