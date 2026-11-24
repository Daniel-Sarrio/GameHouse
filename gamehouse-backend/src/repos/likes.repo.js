const pool = require('../config/database');

/** Experiencia existente (no eliminada) por slug; para quitar un like no hace falta que siga publicada. */
const findExperienceId = async (slug) => (await pool.query(
  'SELECT id FROM experiences WHERE slug = $1 AND deleted_at IS NULL', [slug],
)).rows[0]?.id ?? null;

const countByExperience = async (experienceId) => (await pool.query(
  'SELECT count(*)::int AS count FROM experience_likes WHERE experience_id = $1', [experienceId],
)).rows[0].count;

/** Devuelve false si el usuario ya le había dado like: la clave primaria impide duplicados. */
const create = async (experienceId, userId) => (await pool.query(
  `INSERT INTO experience_likes (experience_id, user_id) VALUES ($1, $2)
    ON CONFLICT (experience_id, user_id) DO NOTHING RETURNING experience_id`,
  [experienceId, userId],
)).rowCount > 0;

/** Devuelve false si no había like que quitar. */
const remove = async (experienceId, userId) => (await pool.query(
  'DELETE FROM experience_likes WHERE experience_id = $1 AND user_id = $2', [experienceId, userId],
)).rowCount > 0;

const findExperienceIdsByUser = async (userId) => (await pool.query(
  'SELECT experience_id FROM experience_likes WHERE user_id = $1 ORDER BY created_at DESC', [userId],
)).rows.map((row) => row.experience_id);

module.exports = { findExperienceId, countByExperience, create, remove, findExperienceIdsByUser };
