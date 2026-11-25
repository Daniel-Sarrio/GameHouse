const repo = require('../repos/reviews.repo');
const commentsRepo = require('../repos/comments.repo');
const comments = require('./comments.service');
const insights = require('./comment-insights.service');
const AppError = require('./utils/app-error');
const validateData = require('./utils/validate-data');
const { reviewQuerySchema } = require('../middleware/review-validation');

// Gestión de opiniones del panel de administración. Las rutas ya exigen sesión y rol ADMIN.

const findExperience = async (id) => {
  const experience = await repo.findExperience(id);
  if (!experience) throw new AppError('Experiencia no encontrada.', 404);
  return experience;
};

const listExperiences = () => repo.findExperiences();

const listComments = async (experienceId, query) => {
  const { page, limit, sort } = validateData(reviewQuerySchema, query);
  const experience = await findExperience(experienceId);
  const [items, summary] = await Promise.all([
    repo.findComments(experience.id, { limit, offset: (page - 1) * limit, sort }),
    commentsRepo.summarize(experience.id),
  ]);
  return {
    experience: { id: experience.id, name: experience.name, slug: experience.slug, status: experience.status },
    items,
    summary,
    sort,
    pagination: { page, limit, total: summary.count, totalPages: Math.max(1, Math.ceil(summary.count / limit)) },
  };
};

/** Moderación: el borrado lógico reutiliza el de los comentarios (que comprueba autor o ADMIN). */
const deleteComment = async (id, user) => {
  const comment = await commentsRepo.findOwnership(id);
  if (!comment) throw new AppError('Comentario no encontrado.', 404);
  return comments.deleteComment(comment.slug, id, user);
};

const getAnalysis = async (experienceId) => insights.getAdminAnalysis(await findExperience(experienceId));

const analyze = async (experienceId) => insights.analyzeNow(await findExperience(experienceId));

module.exports = { listExperiences, listComments, deleteComment, getAnalysis, analyze };
