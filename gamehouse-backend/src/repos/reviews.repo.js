const pool = require('../config/database');

// Opiniones para el panel de administración: experiencias no eliminadas, estén publicadas o no.

/** Experiencias con opiniones, con su media, la fecha de la última y el estado del análisis IA. */
const findExperiences = async () => (await pool.query(`
  SELECT e.id, e.name, e.slug, e.status, e.image_url,
    count(c.id)::int AS comment_count,
    round(avg(c.rating), 1)::float AS average,
    max(c.created_at) AS last_comment_at,
    ci.generated_at AS analyzed_at,
    (ci.signature = md5(string_agg(c.id || ':' || c.rating, ',' ORDER BY c.id))) AS analysis_fresh
  FROM experiences e
  JOIN comments c ON c.experience_id = e.id AND c.deleted_at IS NULL
  LEFT JOIN comment_insights ci ON ci.experience_id = e.id
  WHERE e.deleted_at IS NULL
  GROUP BY e.id, ci.generated_at, ci.signature
  ORDER BY max(c.created_at) DESC, e.id DESC`)).rows.map((row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  status: row.status,
  imageUrl: row.image_url,
  commentCount: row.comment_count,
  average: row.average,
  lastCommentAt: row.last_comment_at,
  analyzedAt: row.analyzed_at,
  analysisFresh: !!row.analysis_fresh,
}));

/** Experiencia con lo que necesita el agente (nombre y categorías). */
const findExperience = async (id) => (await pool.query(`
  SELECT e.id, e.name, e.slug, e.status,
    COALESCE(json_agg(json_build_object('name', cat.name) ORDER BY cat.name) FILTER (WHERE cat.id IS NOT NULL), '[]') AS categories
  FROM experiences e
  LEFT JOIN experience_categories ec ON ec.experience_id = e.id AND ec.deleted_at IS NULL
  LEFT JOIN categories cat ON cat.id = ec.category_id AND cat.deleted_at IS NULL
  WHERE e.id = $1 AND e.deleted_at IS NULL
  GROUP BY e.id`, [id])).rows[0] || null;

// Lista blanca: el cliente elige una clave, nunca un fragmento SQL.
const ORDER_BY = {
  recent: 'c.created_at DESC, c.id DESC',
  rating_desc: 'c.rating DESC, c.created_at DESC, c.id DESC',
  rating_asc: 'c.rating ASC, c.created_at DESC, c.id DESC',
};

/** Comentarios visibles con su autor; el administrador ve también el email para moderar. */
const findComments = async (experienceId, { limit, offset, sort }) => (await pool.query(`
  SELECT c.id, c.rating, c.body, c.created_at, u.email,
    NULLIF(concat_ws(' ', p.first_name, p.last_name), '') AS author_name
  FROM comments c
  JOIN users u ON u.id = c.user_id
  LEFT JOIN profiles p ON p.user_id = c.user_id
  WHERE c.experience_id = $1 AND c.deleted_at IS NULL
  ORDER BY ${ORDER_BY[sort] || ORDER_BY.recent} LIMIT $2 OFFSET $3`, [experienceId, limit, offset])).rows.map((row) => ({
  id: row.id,
  rating: row.rating,
  body: row.body,
  createdAt: row.created_at,
  author: { name: row.author_name, email: row.email },
}));

module.exports = { findExperiences, findExperience, findComments };
