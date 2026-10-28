const argon2 = require('argon2');
const bcrypt = require('bcryptjs');

const hashPassword = (password) => argon2.hash(password, { type: argon2.argon2id });
const verifyPassword = async (hash, password) => {
  if (hash.startsWith('$argon2')) return argon2.verify(hash, password);
  // Compatibilidad con hashes bcrypt anteriores; el login los actualiza a Argon2id.
  if (/^\$2[aby]\$/.test(hash)) return bcrypt.compare(password, hash);
  return false;
};

module.exports = { hashPassword, verifyPassword };
