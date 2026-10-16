const pool = require('../config/database');
const Experience = require('../models/experience.model');
const AppError = require('../services/utils/app-error');

const columns = `e.id, e.name, e.slug, e.description, e.location, e.country, e.city,
  e.price, e.currency, e.duration, e.capacity, e.cover_image, e.gallery,
  e.host_name, e.host_id, e.location_id, e.status, e.is_active,
  e.created_at, e.updated_at, e.deleted_at,
  COALESCE((SELECT array_agg(ec.category_id ORDER BY ec.category_id)
    FROM experience_categories ec WHERE ec.experience_id = e.id), '{}') AS category_ids,
  COALESCE((SELECT array_agg(c.name ORDER BY c.name)
    FROM experience_categories ec JOIN categories c ON c.id = ec.category_id
    WHERE ec.experience_id = e.id), '{}') AS category_names`;

const editableColumns = {
  name: 'name', slug: 'slug', description: 'description', price: 'price',
  currency: 'currency', duration: 'duration', capacity: 'capacity',
  coverImage: 'cover_image', gallery: 'gallery', status: 'status', isActive: 'is_active',
};
const toExperience = (row) => (row ? new Experience(row) : null);

const findAll = async () => {
  const result = await pool.query(`SELECT ${columns} FROM experiences e WHERE e.deleted_at IS NULL ORDER BY e.created_at DESC, e.id DESC`);
  return result.rows.map(toExperience);
};
const findById = async (id) => {
  const result = await pool.query(`SELECT ${columns} FROM experiences e WHERE e.id = $1 AND e.deleted_at IS NULL`, [id]);
  return toExperience(result.rows[0]);
};
const findBySlug = async (slug) => {
  const result = await pool.query(`SELECT ${columns} FROM experiences e WHERE e.slug = $1 AND e.deleted_at IS NULL`, [slug]);
  return toExperience(result.rows[0]);
};
const slugExists = async (slug, excludeId = null) => {
  const result = await pool.query('SELECT 1 FROM experiences WHERE slug = $1 AND ($2::bigint IS NULL OR id <> $2) LIMIT 1', [slug, excludeId]);
  return result.rowCount > 0;
};
const getFormOptions = async () => {
  const [hosts, locations, categories] = await Promise.all([
    pool.query('SELECT id, name FROM hosts ORDER BY name'),
    pool.query('SELECT id, name, city, country, image_url AS "imageUrl" FROM locations ORDER BY name, city'),
    pool.query('SELECT id, name FROM categories ORDER BY name'),
  ]);
  return { hosts: hosts.rows, locations: locations.rows, categories: categories.rows };
};
const selectedValues = async (client, data) => {
  const host = await client.query('SELECT id, name FROM hosts WHERE id = $1', [data.hostId]);
  const location = await client.query('SELECT id, name, city, country FROM locations WHERE id = $1', [data.locationId]);
  const categories = await client.query('SELECT id FROM categories WHERE id = ANY($1::int[])', [data.categoryIds]);
  if (!host.rowCount || !location.rowCount || categories.rowCount !== new Set(data.categoryIds).size) {
    throw new AppError('Selecciona un organizador, lugar y categorías existentes.', 400);
  }
  return { host: host.rows[0], location: location.rows[0] };
};
const replaceCategories = async (client, id, categoryIds) => {
  await client.query('DELETE FROM experience_categories WHERE experience_id = $1', [id]);
  await client.query('INSERT INTO experience_categories (experience_id, category_id) SELECT $1, unnest($2::int[])', [id, [...new Set(categoryIds)]]);
};
const create = async (data) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { host, location } = await selectedValues(client, data);
    const result = await client.query(`INSERT INTO experiences (
      name, slug, description, location, country, city, price, currency,
      duration, capacity, cover_image, gallery, host_name, host_id, location_id, status, is_active
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
    [data.name, data.slug, data.description, location.name, location.country, location.city,
      data.price, data.currency, data.duration, data.capacity, data.coverImage, data.gallery,
      host.name, host.id, location.id, data.status, data.isActive]);
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
    const changes = { ...data };
    if (changes.hostId !== undefined || changes.locationId !== undefined || changes.categoryIds !== undefined) {
      const current = await client.query('SELECT host_id, location_id FROM experiences WHERE id = $1 AND deleted_at IS NULL', [id]);
      if (!current.rowCount) { await client.query('ROLLBACK'); return null; }
      const categoryIds = changes.categoryIds ?? (await client.query('SELECT category_id FROM experience_categories WHERE experience_id = $1', [id])).rows.map((row) => row.category_id);
      const { host, location } = await selectedValues(client, {
        hostId: changes.hostId ?? current.rows[0].host_id,
        locationId: changes.locationId ?? current.rows[0].location_id, categoryIds,
      });
      Object.assign(changes, { host_id: host.id, host_name: host.name, location_id: location.id,
        location: location.name, city: location.city, country: location.country });
      if (changes.categoryIds !== undefined) await replaceCategories(client, id, categoryIds);
    }
    for (const key of ['hostId', 'locationId', 'categoryIds', 'hostName']) delete changes[key];
    if (data.locationId === undefined) for (const key of ['location', 'city', 'country']) delete changes[key];
    const entries = Object.entries(changes);
    const assignments = entries.map(([key], index) => `${editableColumns[key] || key} = $${index + 1}`);
    assignments.push('updated_at = CURRENT_TIMESTAMP');
    const result = await client.query(`UPDATE experiences SET ${assignments.join(', ')} WHERE id = $${entries.length + 1} AND deleted_at IS NULL RETURNING id`,
      [...entries.map(([, value]) => value), id]);
    await client.query('COMMIT');
    return result.rowCount ? findById(id) : null;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
};
const softDelete = async (id) => {
  const result = await pool.query(`UPDATE experiences SET deleted_at = CURRENT_TIMESTAMP,
    is_active = FALSE, status = 'archived', updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND deleted_at IS NULL RETURNING id`, [id]);
  if (!result.rowCount) return null;
  const deleted = await pool.query(`SELECT ${columns} FROM experiences e WHERE e.id = $1`, [id]);
  return toExperience(deleted.rows[0]);
};
module.exports = { findAll, findById, findBySlug, slugExists, getFormOptions, create, update, softDelete };
