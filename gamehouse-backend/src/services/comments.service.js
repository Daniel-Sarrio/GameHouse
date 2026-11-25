const repo = require('../repos/comments.repo');
const shopRepo = require('../repos/shop.repo');
const Comment = require('../models/comment.model');
const insights = require('./comment-insights.service');
const AppError = require('./utils/app-error');
const validateData = require('./utils/validate-data');
const { commentBodySchema, commentQuerySchema } = require('../middleware/comment-validation');

// Solo se comenta y se listan comentarios de experiencias publicadas y visibles en el shop.
const findVisibleExperience = async (slug) => {
  const experience = await shopRepo.findExperienceBySlug(slug);
  if (!experience) throw new AppError('Experiencia no encontrada.', 404);
  return experience;
};

/** Listado público paginado con resumen de valoraciones. `viewer` es el usuario autenticado, si lo hay. */
const listComments = async (slug, query, viewer = null) => {
  const { page, limit, sort } = validateData(commentQuerySchema, query);
  const experience = await findVisibleExperience(slug);
  const [rows, summary] = await Promise.all([
    repo.findByExperience(experience.id, { limit, offset: (page - 1) * limit, sort }),
    repo.summarize(experience.id),
  ]);
  return {
    items: rows.map((row) => new Comment(row, viewer)),
    summary,
    sort,
    pagination: { page, limit, total: summary.count, totalPages: Math.max(1, Math.ceil(summary.count / limit)) },
  };
};

/** El autor es siempre el usuario de la sesión: nunca se acepta desde el cuerpo de la petición. */
const createComment = async (slug, data, user) => {
  if (!user) throw new AppError('Authentication required', 401);
  const { rating, body } = validateData(commentBodySchema, data);
  const experience = await findVisibleExperience(slug);
  const row = await repo.create({ experienceId: experience.id, userId: user.id, rating, body });
  // El análisis del agente IA queda desactualizado: se regenera en segundo plano.
  insights.refreshInBackground(slug);
  return new Comment(row, user);
};

/** Borrado lógico: solo el autor del comentario o un ADMIN. */
const deleteComment = async (slug, id, user) => {
  if (!user) throw new AppError('Authentication required', 401);
  const comment = await repo.findOwnership(id);
  if (!comment || comment.slug !== slug) throw new AppError('Comentario no encontrado.', 404);
  if (comment.user_id !== user.id && user.role !== 'ADMIN') {
    throw new AppError('You do not have permission to access this resource', 403);
  }
  if (!await repo.softDelete(id)) throw new AppError('Comentario no encontrado.', 404);
  insights.refreshInBackground(slug);
  return { id, deleted: true };
};

module.exports = { listComments, createComment, deleteComment };
