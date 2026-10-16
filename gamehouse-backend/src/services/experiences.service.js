const experiencesRepo = require('../repos/experiences.repo');
const AppError = require('./utils/app-error');
const generateSlug = require('./utils/slug');

const getAllExperiences = () => experiencesRepo.findAll();
const getFormOptions = () => experiencesRepo.getFormOptions();

const getExperienceById = async (id) => {
  const experience = await experiencesRepo.findById(id);
  if (!experience) throw new AppError('Experiencia no encontrada.', 404);
  return experience;
};

const getExperienceBySlug = async (slug) => {
  const experience = await experiencesRepo.findBySlug(slug);
  if (!experience) throw new AppError('Experiencia no encontrada.', 404);
  return experience;
};

const buildUniqueSlug = async (name, excludeId = null) => {
  const base = generateSlug(name);
  let candidate = base;
  let suffix = 2;

  while (await experiencesRepo.slugExists(candidate, excludeId)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const createExperience = async (data) => {
  const slug = await buildUniqueSlug(data.slug || data.name);
  return experiencesRepo.create({ ...data, slug });
};

const updateExperience = async (id, data) => {
  await getExperienceById(id);
  const changes = { ...data };

  if (data.name) changes.slug = await buildUniqueSlug(data.name, id);

  const experience = await experiencesRepo.update(id, changes);
  if (!experience) throw new AppError('Experiencia no encontrada.', 404);
  return experience;
};

const setExperienceActive = async (id, isActive) => {
  const current = await getExperienceById(id);
  const status = isActive
    ? (current.status === 'draft' ? 'draft' : 'published')
    : 'suspended';
  return experiencesRepo.update(id, { isActive, status });
};

const deleteExperience = async (id) => {
  const deleted = await experiencesRepo.softDelete(id);
  if (!deleted) throw new AppError('Experiencia no encontrada.', 404);
  return deleted;
};

module.exports = {
  getAllExperiences,
  getFormOptions,
  getExperienceById,
  getExperienceBySlug,
  createExperience,
  updateExperience,
  activateExperience: (id) => setExperienceActive(id, true),
  deactivateExperience: (id) => setExperienceActive(id, false),
  deleteExperience,
};
