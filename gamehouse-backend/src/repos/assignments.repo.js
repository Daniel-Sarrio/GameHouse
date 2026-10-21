const pool = require('../config/database');
const Assignment = require('../models/assignment.model');

const select = `SELECT ec.experience_id, ec.category_id, e.name AS experience_name, c.name AS category_name
  FROM experience_categories ec
  JOIN experiences e ON e.id = ec.experience_id
  JOIN categories c ON c.id = ec.category_id`;
const findAll = async () => {
  const result = await pool.query(`${select} WHERE e.deleted_at IS NULL AND c.deleted_at IS NULL ORDER BY ec.experience_id DESC, c.name`);
  return result.rows.map((row) => new Assignment(row));
};
const findById = async (experienceId, categoryId) => {
  const result = await pool.query(`${select} WHERE ec.experience_id = $1 AND ec.category_id = $2 AND e.deleted_at IS NULL AND c.deleted_at IS NULL`, [experienceId, categoryId]);
  return result.rows[0] ? new Assignment(result.rows[0]) : null;
};
const create = async ({ experienceId, categoryId }) => {
  await pool.query('INSERT INTO experience_categories (experience_id, category_id) VALUES ($1, $2)', [experienceId, categoryId]);
  return findById(experienceId, categoryId);
};
const update = async (experienceId, categoryId, data) => {
  const result = await pool.query(
    'UPDATE experience_categories SET experience_id = $1, category_id = $2 WHERE experience_id = $3 AND category_id = $4 RETURNING *',
    [data.experienceId, data.categoryId, experienceId, categoryId],
  );
  return result.rowCount ? findById(data.experienceId, data.categoryId) : null;
};
const remove = async (experienceId, categoryId) => {
  const result = await pool.query('DELETE FROM experience_categories WHERE experience_id = $1 AND category_id = $2 RETURNING *', [experienceId, categoryId]);
  return result.rowCount > 0;
};
module.exports = { findAll, findById, create, update, remove };
