const pool = require('../config/database');
const Event = require('../models/event.model');

const columns = `ev.id, ev.sku, ev.experience_id, e.name AS experience_name, e.slug AS experience_slug,
  ev.location_id, l.name AS location_name, l.city, l.country,
  ev.category_id, c.name AS category_name, ev.start_datetime, ev.end_datetime,
  ev.price, ev.capacity, ev.status, ev.image_url, ev.duration_minutes,
  ev.legacy_experience_id, ev.created_at, ev.updated_at`;
const select = `SELECT ${columns} FROM events ev
  JOIN experiences e ON e.id = ev.experience_id
  JOIN locations l ON l.id = ev.location_id
  JOIN categories c ON c.id = ev.category_id`;
const toEvent = (row) => row ? new Event(row) : null;
const findAll = async () => (await pool.query(`${select} ORDER BY ev.id DESC`)).rows.map(toEvent);
const findById = async (id) => toEvent((await pool.query(`${select} WHERE ev.id = $1`, [id])).rows[0]);
const findBySku = async (sku) => toEvent((await pool.query(`${select} WHERE ev.sku = $1`, [sku])).rows[0]);
const skuExists = async (sku, excludeId = null) => (await pool.query(
  'SELECT 1 FROM events WHERE sku = $1 AND ($2::int IS NULL OR id <> $2) LIMIT 1', [sku, excludeId],
)).rowCount > 0;
const getFormOptions = async () => {
  const [experiences, locations, categories] = await Promise.all([
    pool.query('SELECT id, name FROM experiences WHERE deleted_at IS NULL ORDER BY name'),
    pool.query('SELECT id, name, city, country FROM locations ORDER BY name'),
    pool.query(`SELECT ec.experience_id AS "experienceId", c.id, c.name
      FROM experience_categories ec JOIN categories c ON c.id = ec.category_id
      WHERE c.deleted_at IS NULL ORDER BY c.name`),
  ]);
  return { experiences: experiences.rows, locations: locations.rows, categories: categories.rows };
};
const create = async (data) => {
  const result = await pool.query(`INSERT INTO events
    (experience_id, location_id, category_id, start_datetime, end_datetime, price, capacity, status, image_url, sku)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
  [data.experienceId, data.locationId, data.categoryId, data.startDatetime,
    data.endDatetime, data.price, data.capacity, data.status, data.imageUrl, data.sku]);
  return findById(result.rows[0].id);
};
const update = async (id, data) => {
  const columns = { experienceId:'experience_id', locationId:'location_id', categoryId:'category_id',
    startDatetime:'start_datetime', endDatetime:'end_datetime', price:'price', capacity:'capacity',
    status:'status', imageUrl:'image_url', sku:'sku' };
  const entries = Object.entries(data).filter(([key]) => columns[key]);
  const assignments = entries.map(([key], index) => `${columns[key]} = $${index+1}`);
  const result = await pool.query(`UPDATE events SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${entries.length+1} RETURNING id`, [...entries.map(([, value]) => value), id]);
  return result.rowCount ? findById(id) : null;
};
const remove = async (id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount) await client.query("DELETE FROM images WHERE entity_type = 'events' AND entity_id = $1", [id]);
    await client.query('COMMIT');
    return result.rowCount > 0;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
};
module.exports = { findAll, findById, findBySku, skuExists, getFormOptions, create, update, remove };
