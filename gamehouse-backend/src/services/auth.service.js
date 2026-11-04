const pool = require('../config/database');
const users = require('../repos/users.repo');
const auth = require('../repos/auth.repo');
const profiles = require('../repos/profiles.repo');
const AppError = require('./utils/app-error');
const { hashPassword, verifyPassword } = require('./utils/password');
const { signToken, verifyToken } = require('./utils/jwt');
const { z } = require('zod');
const validateData = require('./utils/validate-data');
const { registerSchema, loginSchema } = require('./utils/auth-validation');
const { randomBytes } = require('crypto');

let dummyHash;
const register = async (data) => {
  data = validateData(registerSchema, data);
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

const login = async (data) => {
  const { email, password } = validateData(loginSchema, data);
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
  if (!await users.findRole({ role: user.role })) throw new AppError('Authentication required', 401);
  const token = signToken({ id: user.id, role: user.role });
  return { user, token };
};

const me = async (id) => {
  const user = await users.findById(id);
  if (!user) throw new AppError('User not found', 404);
  return user;
};

const logout = async ({ token, expiresAt }) => {
  await auth.revokeToken(token, expiresAt);
  return { message: 'Sesión cerrada correctamente.' };
};

// JWT, usuario y rol deben seguir representando la misma identidad en PostgreSQL.
const validateSession = async (token) => {
  let payload;
  try {
    payload = verifyToken(token);
    if (!z.uuid().safeParse(payload.sub).success || !Number.isFinite(payload.exp)
      || !['USER', 'ADMIN'].includes(payload.role)) throw new Error('Invalid claims');
  } catch { throw new AppError('Authentication required', 401); }
  if (await auth.isTokenRevoked(token)) throw new AppError('Authentication required', 401);
  const user = await users.findById(payload.sub);
  if (!user || user.role !== payload.role || !await users.findRole({ role: user.role })) {
    throw new AppError('Authentication required', 401);
  }
  return { user, expiresAt: new Date(payload.exp * 1000) };
};

module.exports = { register, login, me, logout, validateSession };
