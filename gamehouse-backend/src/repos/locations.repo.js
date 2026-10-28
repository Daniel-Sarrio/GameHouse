const pool = require('../config/database');
const Location = require('../models/location.model');

const findAll = async () => {
  const result = await pool.query('SELECT * FROM locations WHERE deleted_at IS NULL ORDER BY id DESC');
  return result.rows.map((row) => new Location(row));
};
const findById = async (id) => {
  const result = await pool.query('SELECT * FROM locations WHERE id = $1 AND deleted_at IS NULL', [id]);
  return result.rows[0] ? new Location(result.rows[0]) : null;
};
const create = async ({ name, address, city, postalCode, country, imageUrl }) => {
  const result = await pool.query(
    'INSERT INTO locations (name, address, city, postal_code, country, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [name, address, city, postalCode, country, imageUrl],
  );
  return new Location(result.rows[0]);
};
const update = async (id, data) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const columns = { name: 'name', address: 'address', city: 'city', postalCode: 'postal_code', country: 'country', imageUrl: 'image_url' };
    const keys = Object.keys(data).filter((key) => columns[key]);
    const values = keys.map((key) => data[key]);
    const result = await client.query(
      `UPDATE locations SET ${keys.map((key, index) => `${columns[key]} = $${index + 1}`).join(', ')} WHERE id = $${keys.length + 1} AND deleted_at IS NULL RETURNING *`,
      [...values, id],
    );
    const row = result.rows[0];
    await client.query('COMMIT');
    return row ? new Location(row) : null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
};
const softDelete = async (id) => {
  const result = await pool.query('UPDATE locations SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING *', [id]);
  return result.rows[0] ? new Location(result.rows[0]) : null;
};
module.exports = { findAll, findById, create, update, softDelete };
