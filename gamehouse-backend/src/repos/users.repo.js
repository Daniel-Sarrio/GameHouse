const pool = require('../config/database');
const User = require('../models/user.model');
const columns = 'id, email, role, is_active, deleted_at, status, last_login_at, created_at, updated_at';
const select = `SELECT u.id, u.email, u.role, u.is_active, u.deleted_at, u.status, u.last_login_at,
  u.created_at, u.updated_at, r.id AS role_id, p.id AS profile_id, p.first_name, p.last_name, p.avatar_url
  FROM users u LEFT JOIN profiles p ON p.user_id = u.id LEFT JOIN roles r ON r.name = u.role`;
const toUser = (row) => row ? new User(row) : null;
const order = "ORDER BY lower(concat_ws(' ', p.first_name, p.last_name)), u.id";

const findById = async (id, client = pool) => toUser((await client.query(
  `${select} WHERE u.id = $1 AND u.is_active AND u.deleted_at IS NULL`, [id],
)).rows[0]);
const findAnyById = async (id, client = pool) => toUser((await client.query(
  `${select} WHERE u.id = $1 AND u.deleted_at IS NULL`, [id],
)).rows[0]);
const findIncludingDeleted = async (id, client = pool) => toUser((await client.query(`${select} WHERE u.id = $1`, [id])).rows[0]);
const findAll = async ({ limit = 50, offset = 0 } = {}) => (await pool.query(
  `${select} ${order} LIMIT $1 OFFSET $2`, [limit, offset],
)).rows.map(toUser);
const findDeleted = async ({ limit = 50, offset = 0 } = {}) => (await pool.query(
  `${select} WHERE u.deleted_at IS NOT NULL ${order} LIMIT $1 OFFSET $2`, [limit, offset],
)).rows.map(toUser);
const findActive = async () => (await pool.query(`SELECT u.id, u.email,
  concat_ws(' ', p.first_name, p.last_name) AS name FROM users u LEFT JOIN profiles p ON p.user_id = u.id
  WHERE u.is_active AND u.deleted_at IS NULL ORDER BY lower(concat_ws(' ', p.first_name, p.last_name)), u.id`)).rows;
const findCredentials = async (email) => (await pool.query(`SELECT ${columns}, password_hash FROM users
  WHERE lower(email) = lower($1) AND is_active AND deleted_at IS NULL`, [email])).rows[0];
const create = async (client, email, passwordHash, { role = 'USER', status = 'active' } = {}) => toUser((await client.query(
  `INSERT INTO users (email, password_hash, role, status) VALUES ($1, $2, $3, $4) RETURNING ${columns}`,
  [email, passwordHash, role, status],
)).rows[0]);
const update = async (client, id, data) => {
  const fields = { email: 'email', role: 'role', passwordHash: 'password_hash', status: 'status' };
  const entries = Object.entries(data).filter(([key]) => Object.hasOwn(fields, key));
  if (!entries.length) return findById(id, client);
  const assignments = entries.map(([key], i) => `${fields[key]} = $${i + 1}`);
  const result = await client.query(`UPDATE users SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${entries.length + 1} AND is_active AND deleted_at IS NULL RETURNING id`,
  [...entries.map(([, value]) => value), id]);
  return result.rowCount ? findById(id, client) : null;
};
const softDelete = async (client, id) => {
  const result = await client.query(`UPDATE users SET is_active = FALSE, deleted_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING id`, [id]);
  return result.rowCount ? findIncludingDeleted(id, client) : null;
};
const setActive = async (client, id, isActive) => {
  const result = await client.query(`UPDATE users SET is_active = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND deleted_at IS NULL RETURNING id`, [id, isActive]);
  return result.rowCount ? findAnyById(id, client) : null;
};
const existsById = async (id, client = pool) => (await client.query('SELECT 1 FROM users WHERE id = $1', [id])).rowCount > 0;
const emailExists = async (email, excludeId = null, client = pool) => (await client.query(
  'SELECT 1 FROM users WHERE lower(email) = lower($1) AND ($2::uuid IS NULL OR id <> $2)', [email, excludeId],
)).rowCount > 0;
const countByRole = async (role, onlyActive = false, client = pool) => (await client.query(
  'SELECT count(*)::int AS count FROM users WHERE role = $1 AND deleted_at IS NULL AND (NOT $2::boolean OR is_active)', [role, onlyActive],
)).rows[0].count;
const lockById = async (client, id) => (await client.query(
  `SELECT ${columns} FROM users WHERE id = $1 FOR UPDATE`, [id],
)).rows[0];
const findRole = async ({ role, roleId }, client = pool) => (await client.query(
  `SELECT id, name FROM roles WHERE ${roleId !== undefined ? 'id = $1' : 'name = $1'}
   AND is_active AND deleted_at IS NULL FOR SHARE`, [roleId ?? role],
)).rows[0];
const updatePasswordHash = (id, hash) => pool.query(
  'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND is_active AND deleted_at IS NULL', [hash, id],
);
const recordLogin = async (id) => (await pool.query(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP
  WHERE id = $1 AND is_active AND deleted_at IS NULL RETURNING id`, [id])).rowCount > 0;

module.exports = { findById, findAnyById, findIncludingDeleted, findAll, findActive, findDeleted, findCredentials,
  create, update, softDelete, setActive, existsById, emailExists, countByRole, lockById, findRole, updatePasswordHash, recordLogin };
