const repo = require('../repos/categories.repo');
const AppError = require('./utils/app-error');
const generateSlug = require('./utils/slug');

const getAllCategories = () => repo.findAll();
const getCategoryById = async (id) => {
  const category = await repo.findById(id);
  if (!category) throw new AppError('Categoría no encontrada.', 404);
  return category;
};
const getCategoryBySlug = async (slug) => {
  const category = await repo.findBySlug(slug);
  if (!category) throw new AppError('Categoría no encontrada.', 404);
  return category;
};
const buildUniqueSlug = async (name, excludeId = null) => {
  const base = generateSlug(name) || 'categoria';
  let slug = base;
  let suffix = 2;
  while (await repo.slugExists(slug, excludeId)) slug = `${base}-${suffix++}`;
  return slug;
};
const save = async (action) => {
  try { return await action(); }
  catch (error) {
    if (error.code === '23505') throw new AppError('Ya existe una categoría con ese nombre.', 409);
    throw error;
  }
};
const createCategory = async (data) => save(async () => repo.create({
  ...data, slug: await buildUniqueSlug(data.name),
}));
const updateCategory = async (id, data) => {
  await getCategoryById(id);
  const changes = { ...data };
  if (data.name) changes.slug = await buildUniqueSlug(data.name, id);
  const category = await save(() => repo.update(id, changes));
  if (!category) throw new AppError('Categoría no encontrada.', 404);
  return category;
};
const setCategoryActive = async (id, isActive) => {
  const current = await getCategoryById(id);
  const status = isActive ? (current.status === 'draft' ? 'draft' : 'published') : 'suspended';
  return repo.update(id, { isActive, status });
};
const deleteCategory = async (id) => {
  const category = await repo.softDelete(id);
  if (!category) throw new AppError('Categoría no encontrada.', 404);
  return category;
};

module.exports = { getAllCategories, getCategoryById, getCategoryBySlug, createCategory,
  updateCategory, activateCategory: (id) => setCategoryActive(id, true),
  deactivateCategory: (id) => setCategoryActive(id, false), deleteCategory };
