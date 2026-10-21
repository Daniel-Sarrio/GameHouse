const repo = require('../repos/hosts.repo');
const AppError = require('./utils/app-error');
const generateSlug = require('./utils/slug');

const getAllHosts = () => repo.findAll();
const getHostById = async (id) => {
  const host = await repo.findById(id);
  if (!host) throw new AppError('Organizador no encontrado.', 404);
  return host;
};
const getHostBySlug = async (slug) => {
  const host = await repo.findBySlug(slug);
  if (!host) throw new AppError('Organizador no encontrado.', 404);
  return host;
};
const buildUniqueSlug = async (name, excludeId = null) => {
  const base = generateSlug(name) || 'organizador';
  let slug = base;
  let suffix = 2;
  while (await repo.slugExists(slug, excludeId)) slug = `${base}-${suffix++}`;
  return slug;
};
const save = async (action) => {
  try { return await action(); }
  catch (error) {
    if (error.code === '23505') throw new AppError('Ya existe un organizador con ese nombre o correo.', 409);
    throw error;
  }
};
const createHost = async (data) => save(async () => repo.create({
  ...data, slug: await buildUniqueSlug(data.name),
}));
const updateHost = async (id, data) => {
  await getHostById(id);
  const changes = { ...data };
  if (data.name) changes.slug = await buildUniqueSlug(data.name, id);
  const host = await save(() => repo.update(id, changes));
  if (!host) throw new AppError('Organizador no encontrado.', 404);
  return host;
};
const setHostActive = async (id, isActive) => {
  const current = await getHostById(id);
  const status = isActive ? (current.status === 'draft' ? 'draft' : 'published') : 'suspended';
  return repo.update(id, { isActive, status });
};
const deleteHost = async (id) => {
  const host = await repo.softDelete(id);
  if (!host) throw new AppError('Organizador no encontrado.', 404);
  return host;
};

module.exports = { getAllHosts, getHostById, getHostBySlug, createHost,
  updateHost, activateHost: (id) => setHostActive(id, true),
  deactivateHost: (id) => setHostActive(id, false), deleteHost };
