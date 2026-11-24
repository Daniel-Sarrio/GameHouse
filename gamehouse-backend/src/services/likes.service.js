const repo = require('../repos/likes.repo');
const shopRepo = require('../repos/shop.repo');
const AppError = require('./utils/app-error');

// El usuario sale siempre de la sesión (middleware authenticate); nunca de la petición.
const requireUser = (user) => {
  if (!user) throw new AppError('Authentication required', 401);
};

const state = async (experienceId, liked) => ({
  experienceId, liked, likeCount: await repo.countByExperience(experienceId),
});

/** IDs de las experiencias a las que el usuario de la sesión ha dado like. */
const getMyLikes = async (user) => {
  requireUser(user);
  return { experienceIds: await repo.findExperienceIdsByUser(user.id) };
};

/** Solo se da like a experiencias publicadas. Un segundo like a la misma experiencia responde 409. */
const likeExperience = async (slug, user) => {
  requireUser(user);
  const experience = await shopRepo.findExperienceBySlug(slug);
  if (!experience) throw new AppError('Experiencia no encontrada.', 404);
  if (!await repo.create(experience.id, user.id)) throw new AppError('Ya has dado like a esta experiencia.', 409);
  return state(experience.id, true);
};

const unlikeExperience = async (slug, user) => {
  requireUser(user);
  const experienceId = await repo.findExperienceId(slug);
  if (!experienceId) throw new AppError('Experiencia no encontrada.', 404);
  if (!await repo.remove(experienceId, user.id)) throw new AppError('No habías dado like a esta experiencia.', 404);
  return state(experienceId, false);
};

module.exports = { getMyLikes, likeExperience, unlikeExperience };
