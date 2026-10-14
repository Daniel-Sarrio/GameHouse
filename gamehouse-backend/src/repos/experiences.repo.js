const pool = require('../config/database');
const Experience = require('../models/experience.model');

const columns = `
  id, name, slug, description, location, country, city, price, currency,
  duration, capacity, cover_image, gallery, host_name, status, is_active,
  created_at, updated_at, deleted_at
`;

const editableColumns = {
  name: 'name',
  slug: 'slug',
  description: 'description',
  location: 'location',
  country: 'country',
  city: 'city',
  price: 'price',
  currency: 'currency',
  duration: 'duration',
  capacity: 'capacity',
  coverImage: 'cover_image',
  gallery: 'gallery',
  hostName: 'host_name',
  status: 'status',
  isActive: 'is_active',
};

const toExperience = (row) => (row ? new Experience(row) : null);

const findAll = async () => {
  const result = await pool.query(
    `SELECT ${columns} FROM experiences WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC`,
  );
  return result.rows.map(toExperience);
};

const findById = async (id) => {
  const result = await pool.query(
    `SELECT ${columns} FROM experiences WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  return toExperience(result.rows[0]);
};

const findBySlug = async (slug) => {
  const result = await pool.query(
    `SELECT ${columns} FROM experiences WHERE slug = $1 AND deleted_at IS NULL`,
    [slug],
  );
  return toExperience(result.rows[0]);
};

const slugExists = async (slug, excludeId = null) => {
  const result = await pool.query(
    'SELECT 1 FROM experiences WHERE slug = $1 AND ($2::bigint IS NULL OR id <> $2) LIMIT 1',
    [slug, excludeId],
  );
  return result.rowCount > 0;
};

const create = async (data) => {
  const result = await pool.query(
    `INSERT INTO experiences (
      name, slug, description, location, country, city, price, currency,
      duration, capacity, cover_image, gallery, host_name, status, is_active
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    ) RETURNING ${columns}`,
    [
      data.name, data.slug, data.description, data.location, data.country,
      data.city, data.price, data.currency, data.duration, data.capacity,
      data.coverImage, data.gallery, data.hostName, data.status, data.isActive,
    ],
  );
  return toExperience(result.rows[0]);
};

const update = async (id, data) => {
  const entries = Object.entries(data);
  const assignments = entries.map(([key], index) => `${editableColumns[key]} = $${index + 1}`);
  assignments.push('updated_at = CURRENT_TIMESTAMP');

  const result = await pool.query(
    `UPDATE experiences SET ${assignments.join(', ')}
     WHERE id = $${entries.length + 1} AND deleted_at IS NULL
     RETURNING ${columns}`,
    [...entries.map(([, value]) => value), id],
  );
  return toExperience(result.rows[0]);
};

const softDelete = async (id) => {
  const result = await pool.query(
    `UPDATE experiences
     SET deleted_at = CURRENT_TIMESTAMP, is_active = FALSE, status = 'archived', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING ${columns}`,
    [id],
  );
  return toExperience(result.rows[0]);
};

module.exports = { findAll, findById, findBySlug, slugExists, create, update, softDelete };
