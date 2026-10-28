const pool = require('../config/database');
const Event = require('../models/event.model');

const columns = `ev.id, ev.sku, ev.experience_id, e.name AS experience_name, e.slug AS experience_slug,
  ev.location_id, l.name AS location_name, l.city, l.country,
  ev.category_id, c.name AS category_name, ev.start_datetime, ev.end_datetime,
  ev.price, ev.capacity, ev.status, ev.is_active, ev.image_url, ev.duration_minutes,
  ev.legacy_experience_id, ev.created_at, ev.updated_at, ev.deleted_at`;
const select = `SELECT ${columns} FROM events ev
  JOIN experiences e ON e.id = ev.experience_id
  JOIN locations l ON l.id = ev.location_id
  JOIN categories c ON c.id = ev.category_id`;
const toEvent = (row) => row ? new Event(row) : null;
const findAll = async () => (await pool.query(`${select} WHERE ev.deleted_at IS NULL ORDER BY ev.id DESC`)).rows.map(toEvent);
const findById = async (id) => toEvent((await pool.query(`${select} WHERE ev.id = $1 AND ev.deleted_at IS NULL`, [id])).rows[0]);
const findBySku = async (sku) => toEvent((await pool.query(`${select} WHERE ev.sku = $1 AND ev.deleted_at IS NULL`, [sku])).rows[0]);
const skuExists = async (sku, excludeId = null) => (await pool.query(
  'SELECT 1 FROM events WHERE sku = $1 AND ($2::int IS NULL OR id <> $2) LIMIT 1', [sku, excludeId],
)).rowCount > 0;
const getFormOptions = async () => {
  const [experiences, locations, categories] = await Promise.all([
    pool.query('SELECT id, name FROM experiences WHERE deleted_at IS NULL ORDER BY name'),
    pool.query('SELECT id, name, city, country FROM locations WHERE deleted_at IS NULL ORDER BY name'),
    pool.query(`SELECT ec.experience_id AS "experienceId", c.id, c.name
      FROM experience_categories ec JOIN categories c ON c.id = ec.category_id
      WHERE c.deleted_at IS NULL AND ec.deleted_at IS NULL ORDER BY c.name`),
  ]);
  return { experiences: experiences.rows, locations: locations.rows, categories: categories.rows };
};
const create = async (data) => {
  const result = await pool.query(`INSERT INTO events
    (experience_id, location_id, category_id, start_datetime, end_datetime, price, capacity, status, image_url, sku, is_active)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
  [data.experienceId, data.locationId, data.categoryId, data.startDatetime,
    data.endDatetime, data.price, data.capacity, data.status, data.imageUrl, data.sku, data.isActive ?? true]);
  return findById(result.rows[0].id);
};
const update = async (id, data) => {
  const columns = { experienceId:'experience_id', locationId:'location_id', categoryId:'category_id',
    startDatetime:'start_datetime', endDatetime:'end_datetime', price:'price', capacity:'capacity',
    status:'status', imageUrl:'image_url', sku:'sku', isActive:'is_active' };
  const entries = Object.entries(data).filter(([key]) => columns[key]);
  const assignments = entries.map(([key], index) => `${columns[key]} = $${index+1}`);
  const result = await pool.query(`UPDATE events SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${entries.length+1} AND deleted_at IS NULL RETURNING id`, [...entries.map(([, value]) => value), id]);
  return result.rowCount ? findById(id) : null;
};
const softDelete = async (id) => {
  const result = await pool.query(`UPDATE events SET deleted_at = CURRENT_TIMESTAMP,
    is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING id`, [id]);
  return result.rowCount ? toEvent((await pool.query(`${select} WHERE ev.id = $1`, [id])).rows[0]) : null;
};
module.exports = { findAll, findById, findBySku, skuExists, getFormOptions, create, update, softDelete };
