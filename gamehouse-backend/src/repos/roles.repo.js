const pool = require('../config/database');
const Role = require('../models/role.model');

const findAll = async () => {
  const result = await pool.query('SELECT id, name FROM roles ORDER BY id');
  return result.rows.map((row) => new Role(row));
};
const findById = async (id) => {
  const result = await pool.query('SELECT id, name FROM roles WHERE id = $1', [id]);
  return result.rows[0] ? new Role(result.rows[0]) : null;
};
const create = async ({ name }) => {
  const result = await pool.query('INSERT INTO roles (name) VALUES ($1) RETURNING id, name', [name]);
  return new Role(result.rows[0]);
};
const update = async (id, { name }) => {
  const result = await pool.query('UPDATE roles SET name = $1 WHERE id = $2 RETURNING id, name', [name, id]);
  return result.rows[0] ? new Role(result.rows[0]) : null;
};
const remove = async (id) => {
  const result = await pool.query('DELETE FROM roles WHERE id = $1 RETURNING id, name', [id]);
  return result.rows[0] ? new Role(result.rows[0]) : null;
};
module.exports = { findAll, findById, create, update, remove };
