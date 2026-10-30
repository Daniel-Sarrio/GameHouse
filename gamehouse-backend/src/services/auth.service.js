const pool = require('../config/database');
const users = require('../repos/users.repo');
const profiles = require('../repos/profiles.repo');
const AppError = require('./utils/app-error');
const { hashPassword, verifyPassword } = require('./utils/password');
const { signToken } = require('./utils/jwt');
const { randomBytes } = require('crypto');

let dummyHash;
const register = async (data) => {
  const passwordHash = await hashPassword(data.password);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (!await users.findRole({ role: 'USER' }, client)) throw new AppError('El registro no está disponible: el rol USER está desactivado.', 409);
    const created = await users.create(client, data.email, passwordHash);
    const profile = await profiles.create(client, created.id, data);
    const user = await users.findById(created.id, client);
    const token = signToken({ id: user.id, role: user.role });
    await client.query('COMMIT');
    return { user, profile, token };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') throw new AppError('Email already registered', 409);
    throw error;
  } finally { client.release(); }
};

const login = async ({ email, password }) => {
  const credentials = await users.findCredentials(email);
  // Ejecuta también una verificación cuando el correo no existe.
  dummyHash ??= hashPassword(randomBytes(32).toString('hex'));
  const hash = credentials?.password_hash || await dummyHash;
  const valid = await verifyPassword(hash, password);
  if (!credentials || !valid) throw new AppError('Invalid email or password', 401);
  if (!hash.startsWith('$argon2id$')) await users.updatePasswordHash(credentials.id, await hashPassword(password));
  if (!await users.recordLogin(credentials.id)) throw new AppError('Invalid email or password', 401);
  const user = await users.findById(credentials.id);
  if (!user) throw new AppError('Invalid email or password', 401);
  const token = signToken({ id: user.id, role: user.role });
  return { user, token };
};

module.exports = { register, login };
