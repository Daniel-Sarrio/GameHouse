const pool = require('../config/database');
const Assignment = require('../models/assignment.model');
const AppError = require('../services/utils/app-error');

const select = `SELECT ec.experience_id, ec.category_id, ec.deleted_at, e.name AS experience_name, c.name AS category_name
  FROM experience_categories ec
  JOIN experiences e ON e.id = ec.experience_id
  JOIN categories c ON c.id = ec.category_id`;
const findAll = async () => {
  const result = await pool.query(`${select} WHERE ec.deleted_at IS NULL AND e.deleted_at IS NULL AND c.deleted_at IS NULL ORDER BY ec.experience_id DESC, c.name`);
  return result.rows.map((row) => new Assignment(row));
};
const findById = async (experienceId, categoryId) => {
  const result = await pool.query(`${select} WHERE ec.experience_id = $1 AND ec.category_id = $2 AND ec.deleted_at IS NULL AND e.deleted_at IS NULL AND c.deleted_at IS NULL`, [experienceId, categoryId]);
  return result.rows[0] ? new Assignment(result.rows[0]) : null;
};
const insertOrRestore = async (client, experienceId, categoryId) => {
  const result = await client.query(`INSERT INTO experience_categories (experience_id, category_id) VALUES ($1, $2)
    ON CONFLICT (experience_id, category_id) DO UPDATE SET deleted_at = NULL
    WHERE experience_categories.deleted_at IS NOT NULL RETURNING *`, [experienceId, categoryId]);
  if (!result.rowCount) throw new AppError('Esta categoría ya está asignada a la experiencia.', 409);
};
const create = async ({ experienceId, categoryId }) => {
  await insertOrRestore(pool, experienceId, categoryId);
  return findById(experienceId, categoryId);
};
const update = async (experienceId, categoryId, data) => {
  if (experienceId === data.experienceId && categoryId === data.categoryId) return findById(experienceId, categoryId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`UPDATE experience_categories SET deleted_at = CURRENT_TIMESTAMP
      WHERE experience_id = $1 AND category_id = $2 AND deleted_at IS NULL RETURNING *`, [experienceId, categoryId]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return null; }
    await insertOrRestore(client, data.experienceId, data.categoryId);
    await client.query('COMMIT');
    return findById(data.experienceId, data.categoryId);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
};
const softDelete = async (experienceId, categoryId) => {
  const result = await pool.query(`UPDATE experience_categories SET deleted_at = CURRENT_TIMESTAMP
    WHERE experience_id = $1 AND category_id = $2 AND deleted_at IS NULL RETURNING *`, [experienceId, categoryId]);
  if (!result.rowCount) return null;
  const row = (await pool.query(`${select} WHERE ec.experience_id = $1 AND ec.category_id = $2`, [experienceId, categoryId])).rows[0];
  return new Assignment(row);
};
module.exports = { findAll, findById, create, update, softDelete };
