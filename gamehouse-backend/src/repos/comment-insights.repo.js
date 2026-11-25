const pool = require('../config/database');

/**
 * Huella del conjunto de comentarios visibles de una experiencia (ids y valoraciones).
 * Cambia al publicar o borrar un comentario, lo que marca el análisis en caché como desactualizado.
 */
const signature = async (experienceId) => (await pool.query(
  `SELECT md5(COALESCE(string_agg(id || ':' || rating, ',' ORDER BY id), '')) AS signature
    FROM comments WHERE experience_id = $1 AND deleted_at IS NULL`,
  [experienceId],
)).rows[0].signature;

/** Comentarios que se envían al agente: los más recientes, con su valoración y texto. */
const findForAnalysis = async (experienceId, limit) => (await pool.query(
  `SELECT rating, body FROM comments WHERE experience_id = $1 AND deleted_at IS NULL
    ORDER BY created_at DESC, id DESC LIMIT $2`,
  [experienceId, limit],
)).rows;

const findByExperience = async (experienceId) => (await pool.query(
  'SELECT * FROM comment_insights WHERE experience_id = $1', [experienceId],
)).rows[0] || null;

const upsert = async (experienceId, {
  signature: sig, analyzedCount, recommendCount, aspects, summary, positives, negatives, sentiment,
}) => (await pool.query(
  `INSERT INTO comment_insights (experience_id, signature, analyzed_count, recommend_count, aspects, summary,
      positives, negatives, sentiment_positive, sentiment_neutral, sentiment_negative, generated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
    ON CONFLICT (experience_id) DO UPDATE SET signature = EXCLUDED.signature, analyzed_count = EXCLUDED.analyzed_count,
      recommend_count = EXCLUDED.recommend_count, aspects = EXCLUDED.aspects, summary = EXCLUDED.summary,
      positives = EXCLUDED.positives, negatives = EXCLUDED.negatives, sentiment_positive = EXCLUDED.sentiment_positive,
      sentiment_neutral = EXCLUDED.sentiment_neutral, sentiment_negative = EXCLUDED.sentiment_negative,
      generated_at = EXCLUDED.generated_at
    RETURNING *`,
  [experienceId, sig, analyzedCount, recommendCount, JSON.stringify(aspects), summary,
    JSON.stringify(positives), JSON.stringify(negatives), sentiment.positive, sentiment.neutral, sentiment.negative],
)).rows[0];

module.exports = { signature, findForAnalysis, findByExperience, upsert };
