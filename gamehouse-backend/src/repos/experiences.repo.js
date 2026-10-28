const pool = require('../config/database');
const Experience = require('../models/experience.model');
const AppError = require('../services/utils/app-error');

const columns = `e.id, e.name, e.slug, e.description, e.image_url, e.host_id,
  h.name AS host_name, e.status, e.is_active, e.created_at, e.updated_at, e.deleted_at,
  COALESCE((SELECT array_agg(ec.category_id ORDER BY ec.category_id) FROM experience_categories ec
    JOIN categories c ON c.id = ec.category_id
    WHERE ec.experience_id = e.id AND ec.deleted_at IS NULL AND c.deleted_at IS NULL), '{}') AS category_ids,
  COALESCE((SELECT array_agg(c.name ORDER BY c.name) FROM experience_categories ec
    JOIN categories c ON c.id = ec.category_id WHERE ec.experience_id = e.id AND ec.deleted_at IS NULL AND c.deleted_at IS NULL), '{}') AS category_names,
  (SELECT count(*)::int FROM events ev WHERE ev.experience_id = e.id AND ev.deleted_at IS NULL) AS event_count`;
const select = `SELECT ${columns} FROM experiences e LEFT JOIN hosts h ON h.id = e.host_id`;
const toExperience = (row) => row ? new Experience(row) : null;
const findAll = async () => (await pool.query(`${select} WHERE e.deleted_at IS NULL ORDER BY e.created_at DESC, e.id DESC`)).rows.map(toExperience);
const findById = async (id) => toExperience((await pool.query(`${select} WHERE e.id = $1 AND e.deleted_at IS NULL`, [id])).rows[0]);
const findBySlug = async (slug) => toExperience((await pool.query(`${select} WHERE e.slug = $1 AND e.deleted_at IS NULL`, [slug])).rows[0]);
const slugExists = async (slug, excludeId = null) => (await pool.query(
  'SELECT 1 FROM experiences WHERE slug = $1 AND ($2::int IS NULL OR id <> $2) LIMIT 1', [slug, excludeId],
)).rowCount > 0;
const getFormOptions = async () => {
  const [hosts, categories] = await Promise.all([
    pool.query('SELECT id, name FROM hosts WHERE deleted_at IS NULL ORDER BY name'),
    pool.query('SELECT id, name FROM categories WHERE deleted_at IS NULL ORDER BY name'),
  ]);
  return { hosts: hosts.rows, categories: categories.rows };
};
const checkReferences = async (client, data) => {
  const host = await client.query('SELECT id FROM hosts WHERE id = $1 AND deleted_at IS NULL', [data.hostId]);
  const categories = await client.query('SELECT id FROM categories WHERE id = ANY($1::int[]) AND deleted_at IS NULL', [data.categoryIds]);
  if (!host.rowCount || categories.rowCount !== new Set(data.categoryIds).size || categories.rowCount !== data.categoryIds.length) {
    throw new AppError('Selecciona un organizador y categorías existentes sin repetirlas.', 400);
  }
};
const replaceCategories = async (client, id, ids) => {
  // Solo se quitan las categorías retiradas: conservar una asignación no debe desactivar sus eventos.
  await client.query('UPDATE experience_categories SET deleted_at = CURRENT_TIMESTAMP WHERE experience_id = $1 AND deleted_at IS NULL AND NOT (category_id = ANY($2::int[]))', [id, ids]);
  await client.query(`INSERT INTO experience_categories (experience_id, category_id) SELECT $1, unnest($2::int[])
    ON CONFLICT (experience_id, category_id) DO UPDATE SET deleted_at = NULL
    WHERE experience_categories.deleted_at IS NOT NULL`, [id, ids]);
};
const create = async (data) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await checkReferences(client, data);
    const result = await client.query(`INSERT INTO experiences
      (name, slug, description, image_url, host_id, status, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [data.name, data.slug, data.description, data.imageUrl, data.hostId, data.status, data.isActive]);
    await replaceCategories(client, result.rows[0].id, data.categoryIds);
    await client.query('COMMIT');
    return findById(result.rows[0].id);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
};
const update = async (id, data) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT id FROM experiences WHERE id = $1 AND deleted_at IS NULL FOR UPDATE', [id]);
    if (!current.rowCount) { await client.query('ROLLBACK'); return null; }
    if (data.hostId !== undefined || data.categoryIds !== undefined) {
      const old = await findById(id);
      await checkReferences(client, { hostId: data.hostId ?? old.hostId, categoryIds: data.categoryIds ?? old.categoryIds });
    }
    const columns = { name:'name', slug:'slug', description:'description', imageUrl:'image_url', hostId:'host_id', status:'status', isActive:'is_active' };
    const entries = Object.entries(data).filter(([key]) => columns[key]);
    if (entries.length) {
      const assignments = entries.map(([key], i) => `${columns[key]} = $${i+1}`);
      await client.query(`UPDATE experiences SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${entries.length+1} AND deleted_at IS NULL`,
        [...entries.map(([, value]) => value), id]);
    }
    if (data.categoryIds !== undefined) await replaceCategories(client, id, data.categoryIds);
    await client.query('COMMIT');
    return findById(id);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
};
const softDelete = async (id) => {
  const result = await pool.query(`UPDATE experiences SET deleted_at = CURRENT_TIMESTAMP,
    is_active = FALSE, status = 'archived', updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND deleted_at IS NULL RETURNING id`, [id]);
  return result.rowCount ? findByIdIncludingDeleted(id) : null;
};
const findByIdIncludingDeleted = async (id) => toExperience((await pool.query(`${select} WHERE e.id = $1`, [id])).rows[0]);
const findOwnership = async (id) => (await pool.query(`SELECT e.host_id AS "hostId", h.user_id AS "userId"
  FROM experiences e JOIN hosts h ON h.id = e.host_id
  WHERE e.id = $1 AND e.deleted_at IS NULL`, [id])).rows[0];
module.exports = { findAll, findById, findBySlug, slugExists, getFormOptions, create, update, softDelete, findOwnership };
