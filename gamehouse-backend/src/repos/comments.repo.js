const pool = require('../config/database');

const SELECT = `SELECT c.id, c.rating, c.body, c.created_at, c.user_id, p.first_name, p.last_name, p.avatar_url
  FROM comments c LEFT JOIN profiles p ON p.user_id = c.user_id`;

// Lista blanca: el cliente elige una clave, nunca un fragmento SQL.
const ORDER_BY = {
  recent: 'c.created_at DESC, c.id DESC',
  rating_desc: 'c.rating DESC, c.created_at DESC, c.id DESC',
  rating_asc: 'c.rating ASC, c.created_at DESC, c.id DESC',
};

const findByExperience = async (experienceId, { limit, offset, sort = 'recent' }) => (await pool.query(
  `${SELECT} WHERE c.experience_id = $1 AND c.deleted_at IS NULL
    ORDER BY ${ORDER_BY[sort] || ORDER_BY.recent} LIMIT $2 OFFSET $3`,
  [experienceId, limit, offset],
)).rows;

/** Número de comentarios, media y reparto por estrellas de una experiencia. */
const summarize = async (experienceId) => {
  const { rows } = await pool.query(
    `SELECT rating, count(*)::int AS count FROM comments
      WHERE experience_id = $1 AND deleted_at IS NULL GROUP BY rating`,
    [experienceId],
  );
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of rows) distribution[row.rating] = row.count;
  const count = rows.reduce((total, row) => total + row.count, 0);
  const sum = rows.reduce((total, row) => total + row.rating * row.count, 0);
  return { count, average: count ? Math.round((sum / count) * 10) / 10 : null, distribution };
};

const findById = async (id) => (await pool.query(`${SELECT} WHERE c.id = $1 AND c.deleted_at IS NULL`, [id])).rows[0] || null;

const create = async ({ experienceId, userId, rating, body }) => {
  const { rows } = await pool.query(
    'INSERT INTO comments (experience_id, user_id, rating, body) VALUES ($1, $2, $3, $4) RETURNING id',
    [experienceId, userId, rating, body],
  );
  return findById(rows[0].id);
};

/** Datos mínimos para autorizar el borrado: autor y slug de su experiencia. */
const findOwnership = async (id) => (await pool.query(
  `SELECT c.id, c.user_id, e.slug FROM comments c JOIN experiences e ON e.id = c.experience_id
    WHERE c.id = $1 AND c.deleted_at IS NULL`,
  [id],
)).rows[0] || null;

const softDelete = async (id) => (await pool.query(
  'UPDATE comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING id',
  [id],
)).rowCount > 0;

module.exports = { findByExperience, summarize, findById, create, findOwnership, softDelete };
