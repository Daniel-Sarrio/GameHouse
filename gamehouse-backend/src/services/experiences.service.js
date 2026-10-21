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
  const base = generateSlug(name) || 'experiencia';
  let candidate = base;
  let suffix = 2;
  while (await experiencesRepo.slugExists(candidate, excludeId)) candidate = `${base}-${suffix++}`;
  return candidate;
};
const save = async (action) => {
  try { return await action(); }
  catch (error) {
    if (error.code === '23505') throw new AppError('Ya existe una experiencia con esos datos.', 409);
    throw error;
  }
};
const createExperience = async (data) => save(async () => experiencesRepo.create({
  ...data, slug: await buildUniqueSlug(data.name),
}));
const updateExperience = async (id, data) => {
  // ID: debe identificar una experiencia existente y no eliminada.
  await getExperienceById(id);
  // Campos: lugar, precio, capacidad, duración y fechas pertenecen a events.
  const changes = { ...data };
  // Organizador y categorías: el repositorio comprueba sus IDs reales en la BD.
  if (changes.name) changes.slug = await buildUniqueSlug(changes.name, id);
  const experience = await save(() => experiencesRepo.update(id, changes));
  if (!experience) throw new AppError('Experiencia no encontrada.', 404);
  return experience;
};
const setExperienceActive = async (id, isActive) => {
  const current = await getExperienceById(id);
  const status = isActive ? (current.status === 'draft' ? 'draft' : 'published') : 'suspended';
  return experiencesRepo.update(id, { isActive, status });
};
const deleteExperience = async (id) => {
  const deleted = await experiencesRepo.softDelete(id);
  if (!deleted) throw new AppError('Experiencia no encontrada.', 404);
  return deleted;
};
module.exports = { getAllExperiences, getFormOptions, getExperienceById, getExperienceBySlug,
  createExperience, updateExperience, activateExperience: (id) => setExperienceActive(id, true),
  deactivateExperience: (id) => setExperienceActive(id, false), deleteExperience };
