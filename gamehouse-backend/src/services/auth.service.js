const pool = require('../config/database');
const users = require('../repos/users.repo');
const auth = require('../repos/auth.repo');
const profiles = require('../repos/profiles.repo');
const AppError = require('./utils/app-error');
const { hashPassword, verifyPassword } = require('./utils/password');
const { signAccessToken, verifyToken, verifyTokenIgnoringExpiration, refreshTokenTtlMs } = require('./utils/jwt');
const { z } = require('zod');
const validateData = require('./utils/validate-data');
const { registerSchema, loginSchema } = require('./utils/auth-validation');
const { randomBytes } = require('crypto');

// Si dos peticiones rotan el mismo refresh token a la vez (varias pestañas), la segunda llega con el
// token recién sustituido. Dentro de este margen no se trata como robo: no recibe tokens nuevos, pero
// el navegador ya tiene las cookies de la primera respuesta.
const ROTATION_GRACE_MS = 30 * 1000;
const unauthorized = () => new AppError('Authentication required', 401);
const isUuid = (value) => z.uuid().safeParse(value).success;

/** Lo único que el cliente necesita del usuario autenticado: sin estado, fechas, ids internos ni tokens. */
const toSessionUser = (user) => ({
  id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl,
});

const issueSession = async (user) => {
  const session = await auth.createSession(user.id, new Date(Date.now() + refreshTokenTtlMs));
  return {
    user: toSessionUser(user),
    tokens: {
      access: signAccessToken({ userId: user.id, sessionId: session.sessionId, sessionExpiresAt: session.expiresAt }),
      refresh: { token: session.token, expiresAt: session.expiresAt },
    },
  };
};

// Usuario activo, no eliminado y con un rol activo que permite autenticación.
const findAuthorizedUser = async (id, client) => {
  const user = await users.findById(id, client);
  if (!user || !await users.findRole({ role: user.role }, client)) return null;
  return user;
};

let dummyHash;
const register = async (data) => {
  data = validateData(registerSchema, data);
  const passwordHash = await hashPassword(data.password);
  const client = await pool.connect();
  let user;
  try {
    await client.query('BEGIN');
    if (!await users.findRole({ role: 'USER' }, client)) throw new AppError('El registro no está disponible: el rol USER está desactivado.', 409);
    const created = await users.create(client, data.email, passwordHash);
    await profiles.create(client, created.id, data);
    user = await users.findById(created.id, client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') throw new AppError('Email already registered', 409);
    throw error;
  } finally { client.release(); }
  return issueSession(user);
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
  const user = await findAuthorizedUser(credentials.id);
  if (!user) throw new AppError('Invalid email or password', 401);
  return issueSession(user);
};

const me = async (id) => {
  const user = await users.findById(id);
  if (!user) throw new AppError('User not found', 404);
  return toSessionUser(user);
};

/**
 * Rota el refresh token: el usado queda revocado y se emiten un access token y un refresh token nuevos.
 * Reutilizar un refresh token ya rotado indica robo: se revoca la sesión completa.
 * Devuelve `null` si otra petición simultánea acaba de rotarlo (las cookies nuevas ya van en esa respuesta).
 */
const refresh = async (refreshToken) => {
  if (!refreshToken) throw unauthorized();
  const client = await pool.connect();
  let outcome;
  try {
    await client.query('BEGIN');
    const stored = await auth.findForUpdate(client, refreshToken);
    if (!stored || stored.expiresAt <= new Date()) {
      outcome = { error: true };
    } else if (stored.revokedAt) {
      const concurrent = stored.replacedBy && Date.now() - stored.revokedAt.getTime() < ROTATION_GRACE_MS;
      if (!concurrent) await auth.revokeSession(stored.sessionId, client);
      outcome = concurrent ? { session: null } : { error: true };
    } else {
      const user = await findAuthorizedUser(stored.userId, client);
      if (!user) {
        await auth.revokeSession(stored.sessionId, client);
        outcome = { error: true };
      } else {
        const next = await auth.rotate(client, stored);
        outcome = { session: {
          access: signAccessToken({ userId: user.id, sessionId: stored.sessionId, sessionExpiresAt: stored.expiresAt }),
          refresh: { token: next.token, expiresAt: next.expiresAt },
        } };
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
  if (outcome.error) throw unauthorized();
  return outcome.session;
};

/** Cierra la sesión de las cookies presentes, aunque el access token ya haya caducado. Es idempotente. */
const logout = async ({ accessToken, refreshToken }) => {
  const sessions = new Set();
  if (refreshToken) {
    const stored = await auth.findByToken(refreshToken);
    if (stored) sessions.add(stored.sessionId);
  }
  if (accessToken) {
    try {
      const { sid } = verifyTokenIgnoringExpiration(accessToken);
      if (isUuid(sid)) sessions.add(sid);
    } catch { /* Token manipulado o de otro emisor: no identifica ninguna sesión. */ }
  }
  for (const sessionId of sessions) await auth.revokeSession(sessionId);
  return { message: 'Sesión cerrada correctamente.' };
};

// El access token debe pertenecer a una sesión activa y a un usuario activo con rol activo en PostgreSQL.
const validateSession = async (accessToken) => {
  let payload;
  try {
    payload = verifyToken(accessToken);
    if (!isUuid(payload.sub) || !isUuid(payload.sid) || !Number.isFinite(payload.exp)) throw new Error('Invalid claims');
  } catch { throw unauthorized(); }
  if (!await auth.isSessionActive(payload.sid, payload.sub)) throw unauthorized();
  const user = await findAuthorizedUser(payload.sub);
  if (!user) throw unauthorized();
  return { user, sessionId: payload.sid };
};

module.exports = { register, login, me, refresh, logout, validateSession, toSessionUser };
