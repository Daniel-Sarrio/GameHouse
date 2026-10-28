const pool = require('../config/database');
const Role = require('../models/role.model');

const findAll = async () => {
  const result = await pool.query('SELECT id, name, is_active, deleted_at FROM roles WHERE deleted_at IS NULL ORDER BY id');
  return result.rows.map((row) => new Role(row));
};
const findById = async (id) => {
  const result = await pool.query('SELECT id, name, is_active, deleted_at FROM roles WHERE id = $1 AND deleted_at IS NULL', [id]);
  return result.rows[0] ? new Role(result.rows[0]) : null;
};
const create = async ({ name, isActive = true }) => {
  const result = await pool.query('INSERT INTO roles (name, is_active) VALUES ($1, $2) RETURNING id, name, is_active, deleted_at', [name, isActive]);
  return new Role(result.rows[0]);
};
const update = async (id, { name, isActive }) => {
  const result = await pool.query(`UPDATE roles SET name = COALESCE($1, name), is_active = COALESCE($2, is_active)
    WHERE id = $3 AND deleted_at IS NULL RETURNING id, name, is_active, deleted_at`, [name ?? null, isActive ?? null, id]);
  return result.rows[0] ? new Role(result.rows[0]) : null;
};
const softDelete = async (id) => {
  const result = await pool.query('UPDATE roles SET is_active = FALSE, deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING id, name, is_active, deleted_at', [id]);
  return result.rows[0] ? new Role(result.rows[0]) : null;
};
module.exports = { findAll, findById, create, update, softDelete };
