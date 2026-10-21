const pool = require('../config/database');
const Category = require('../models/category.model');

const columns = 'id, name, slug, description, image_url, status, is_active, created_at, updated_at, deleted_at';
const editableColumns = { name: 'name', slug: 'slug', description: 'description',
  imageUrl: 'image_url', status: 'status', isActive: 'is_active' };
const toCategory = (row) => (row ? new Category(row) : null);

const findAll = async () => {
  const result = await pool.query(`SELECT ${columns} FROM categories WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC`);
  return result.rows.map(toCategory);
};
const findById = async (id) => {
  const result = await pool.query(`SELECT ${columns} FROM categories WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return toCategory(result.rows[0]);
};
const findBySlug = async (slug) => {
  const result = await pool.query(`SELECT ${columns} FROM categories WHERE slug = $1 AND deleted_at IS NULL`, [slug]);
  return toCategory(result.rows[0]);
};
const slugExists = async (slug, excludeId = null) => {
  const result = await pool.query('SELECT 1 FROM categories WHERE slug = $1 AND ($2::int IS NULL OR id <> $2) LIMIT 1', [slug, excludeId]);
  return result.rowCount > 0;
};
const create = async (data) => {
  const result = await pool.query(`INSERT INTO categories (name, slug, description, image_url, status, is_active)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${columns}`,
  [data.name, data.slug, data.description, data.imageUrl, data.status, data.isActive]);
  return toCategory(result.rows[0]);
};
const update = async (id, data) => {
  const entries = Object.entries(data);
  const assignments = entries.map(([key], index) => `${editableColumns[key]} = $${index + 1}`);
  assignments.push('updated_at = CURRENT_TIMESTAMP');
  const result = await pool.query(`UPDATE categories SET ${assignments.join(', ')}
    WHERE id = $${entries.length + 1} AND deleted_at IS NULL RETURNING ${columns}`,
  [...entries.map(([, value]) => value), id]);
  return toCategory(result.rows[0]);
};
const softDelete = async (id) => {
  const result = await pool.query(`UPDATE categories SET deleted_at = CURRENT_TIMESTAMP,
    is_active = FALSE, status = 'archived', updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND deleted_at IS NULL RETURNING ${columns}`, [id]);
  return toCategory(result.rows[0]);
};

module.exports = { findAll, findById, findBySlug, slugExists, create, update, softDelete };
