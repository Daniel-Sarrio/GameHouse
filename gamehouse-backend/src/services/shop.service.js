const repo = require('../repos/shop.repo');
const AppError = require('./utils/app-error');
const validateData = require('./utils/validate-data');
const { shopQuerySchema } = require('../middleware/shop-validation');

const getCategories = () => repo.findCategories();
const getHosts = () => repo.findHosts();
const getLocations = () => repo.findLocations();

// Convierte los query params en filtros validados y devuelve la página con sus metadatos.
const getExperiences = async (query) => {
  const filters = validateData(shopQuerySchema, query);
  const { items, total } = await repo.findExperiences(filters);
  return {
    items,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
};

const getExperienceBySlug = async (slug) => {
  const experience = await repo.findExperienceBySlug(slug);
  if (!experience) throw new AppError('Experiencia no encontrada.', 404);
  // La experiencia y sus eventos pueden compartir imagen: el carrusel no la repite.
  experience.images = [...new Set(experience.images)];
  return experience;
};

const getDepartures = async (slug) => {
  const experience = await repo.findExperienceBySlug(slug);
  if (!experience) throw new AppError('Experiencia no encontrada.', 404);
  return repo.findDeparturesByExperience(experience.id);
};

module.exports = { getCategories, getHosts, getLocations, getExperiences, getExperienceBySlug, getDepartures };
