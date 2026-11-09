const pool = require('../config/database');
const ShopFacet = require('../models/shop-facet.model');
const ShopExperience = require('../models/shop-experience.model');
const Departure = require('../models/departure.model');

// Reglas de visibilidad pública, compartidas por todas las consultas del shop.
const VISIBLE_EXPERIENCE = `e.deleted_at IS NULL AND e.is_active AND e.status = 'published'
  AND h.deleted_at IS NULL AND h.is_active`;
const VISIBLE_CATEGORY = 'ec.deleted_at IS NULL AND c.deleted_at IS NULL AND c.is_active';
// start_datetime es TIMESTAMP sin zona: se compara con LOCALTIMESTAMP.
const BOOKABLE_DEPARTURE = `ev.deleted_at IS NULL AND ev.is_active AND ev.status = 'scheduled'
  AND ev.start_datetime >= LOCALTIMESTAMP AND l.deleted_at IS NULL`;

// Lista blanca: el cliente elige una clave, nunca un fragmento SQL.
const ORDER_BY = {
  recent: 'e.created_at DESC, e.id DESC',
  name: 'e.name ASC, e.id ASC',
  price_asc: 'dep.min_price ASC NULLS LAST, e.id ASC',
  price_desc: 'dep.min_price DESC NULLS LAST, e.id DESC',
  date: 'dep.next_departure ASC NULLS LAST, e.id ASC',
};

const escapeLike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

// Construye el WHERE dinámico con parámetros posicionales ($1, $2...): los valores nunca se concatenan.
const buildFilters = ({ category = [], host = [], location = [], search }) => {
  const params = [];
  const param = (value) => { params.push(value); return `$${params.length}`; };
  const conditions = [VISIBLE_EXPERIENCE];

  if (category.length) {
    conditions.push(`EXISTS (SELECT 1 FROM experience_categories ec JOIN categories c ON c.id = ec.category_id
      WHERE ec.experience_id = e.id AND ${VISIBLE_CATEGORY} AND ec.category_id = ANY(${param(category)}::int[]))`);
  }
  if (host.length) conditions.push(`e.host_id = ANY(${param(host)}::int[])`);
  if (location.length) {
    conditions.push(`EXISTS (SELECT 1 FROM events ev JOIN locations l ON l.id = ev.location_id
      WHERE ev.experience_id = e.id AND ${BOOKABLE_DEPARTURE} AND ev.location_id = ANY(${param(location)}::int[]))`);
  }
  if (search) conditions.push(`e.name ILIKE ${param(`%${escapeLike(search)}%`)}`);

  return { where: conditions.join(' AND '), params };
};

const FROM_EXPERIENCES = 'FROM experiences e JOIN hosts h ON h.id = e.host_id';
const CATEGORIES_LATERAL = `LEFT JOIN LATERAL (
    SELECT COALESCE(json_agg(json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) ORDER BY c.name), '[]') AS categories
    FROM experience_categories ec JOIN categories c ON c.id = ec.category_id
    WHERE ec.experience_id = e.id AND ${VISIBLE_CATEGORY}
  ) cat ON TRUE`;
const DEPARTURES_LATERAL = `LEFT JOIN LATERAL (
    SELECT min(ev.price) AS min_price, min(ev.start_datetime) AS next_departure, count(*)::int AS departure_count,
      COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', l.id, 'name', l.name, 'city', l.city, 'country', l.country)), '[]') AS locations
    FROM events ev JOIN locations l ON l.id = ev.location_id
    WHERE ev.experience_id = e.id AND ${BOOKABLE_DEPARTURE}
  ) dep ON TRUE`;
const SUMMARY_COLUMNS = `e.id, e.name, e.slug, e.description, e.image_url,
  h.id AS host_id, h.name AS host_name, h.slug AS host_slug,
  cat.categories, dep.locations, dep.min_price, dep.next_departure, dep.departure_count`;

const findExperiences = async (filters) => {
  const { where, params } = buildFilters(filters);
  const offset = (filters.page - 1) * filters.limit;
  const pageParams = [...params, filters.limit, offset];
  const [count, rows] = await Promise.all([
    pool.query(`SELECT count(*)::int AS total ${FROM_EXPERIENCES} WHERE ${where}`, params),
    pool.query(`SELECT ${SUMMARY_COLUMNS} ${FROM_EXPERIENCES} ${CATEGORIES_LATERAL} ${DEPARTURES_LATERAL}
      WHERE ${where} ORDER BY ${ORDER_BY[filters.sort] || ORDER_BY.recent}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, pageParams),
  ]);
  return { items: rows.rows.map((row) => new ShopExperience(row)), total: count.rows[0].total };
};

const findExperienceBySlug = async (slug) => {
  const result = await pool.query(`SELECT ${SUMMARY_COLUMNS}, h.description AS host_description, h.image_url AS host_image_url,
      COALESCE((SELECT json_agg(img.url ORDER BY img.source, img.is_main DESC, img.position) FROM (
        SELECT i.url, 0 AS source, i.is_main, i.position FROM images i
          WHERE i.entity_type = 'experiences' AND i.entity_id = e.id
        UNION ALL
        SELECT ev.image_url, 1, FALSE, ev.id FROM events ev JOIN locations l ON l.id = ev.location_id
          WHERE ev.experience_id = e.id AND ${BOOKABLE_DEPARTURE} AND ev.image_url IS NOT NULL
      ) img), '[]') AS images
    ${FROM_EXPERIENCES} ${CATEGORIES_LATERAL} ${DEPARTURES_LATERAL}
    WHERE ${VISIBLE_EXPERIENCE} AND e.slug = $1`, [slug]);
  return result.rows[0] ? new ShopExperience(result.rows[0]) : null;
};

const findDeparturesByExperience = async (experienceId) => (await pool.query(`SELECT ev.id, ev.sku,
    ev.start_datetime, ev.end_datetime, ev.price, ev.capacity, ev.image_url,
    l.id AS location_id, l.name AS location_name, l.address, l.city, l.postal_code, l.country,
    c.id AS category_id, c.name AS category_name
  FROM events ev JOIN locations l ON l.id = ev.location_id JOIN categories c ON c.id = ev.category_id
  WHERE ev.experience_id = $1 AND ${BOOKABLE_DEPARTURE}
  ORDER BY ev.start_datetime, ev.id`, [experienceId])).rows.map((row) => new Departure(row));

// Facetas: solo se devuelven las que tienen al menos una experiencia visible.
const findCategories = async () => (await pool.query(`SELECT c.id, c.name, c.slug, c.description, c.image_url,
    count(DISTINCT e.id)::int AS experience_count
  FROM categories c
  JOIN experience_categories ec ON ec.category_id = c.id
  JOIN experiences e ON e.id = ec.experience_id JOIN hosts h ON h.id = e.host_id
  WHERE ${VISIBLE_CATEGORY} AND ${VISIBLE_EXPERIENCE}
  GROUP BY c.id ORDER BY c.name`)).rows.map((row) => new ShopFacet(row));

const findHosts = async () => (await pool.query(`SELECT h.id, h.name, h.slug, h.description, h.image_url,
    count(e.id)::int AS experience_count
  FROM hosts h JOIN experiences e ON e.host_id = h.id
  WHERE ${VISIBLE_EXPERIENCE}
  GROUP BY h.id ORDER BY h.name`)).rows.map((row) => new ShopFacet(row));

const findLocations = async () => (await pool.query(`SELECT l.id, l.name, l.image_url, l.city, l.country,
    count(DISTINCT e.id)::int AS experience_count
  FROM locations l
  JOIN events ev ON ev.location_id = l.id
  JOIN experiences e ON e.id = ev.experience_id JOIN hosts h ON h.id = e.host_id
  WHERE ${BOOKABLE_DEPARTURE} AND ${VISIBLE_EXPERIENCE}
  GROUP BY l.id ORDER BY l.name`)).rows.map((row) => new ShopFacet(row));

module.exports = {
  findExperiences,
  findExperienceBySlug,
  findDeparturesByExperience,
  findCategories,
  findHosts,
  findLocations,
};
