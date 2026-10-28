const repo = require('../repos/events.repo');
const AppError = require('./utils/app-error');
const generateSku = require('./utils/sku');

const getAllEvents = () => repo.findAll();
const getFormOptions = () => repo.getFormOptions();
const getEventById = async (id) => {
  const event = await repo.findById(id);
  if (!event) throw new AppError('Evento no encontrado.', 404);
  return event;
};
const getEventBySku = async (sku) => {
  const event = await repo.findBySku(sku);
  if (!event) throw new AppError('Evento no encontrado.', 404);
  return event;
};
const buildUniqueSku = async (name, excludeId = null) => {
  const base = generateSku(name) || 'EVENTO';
  let candidate = base;
  let suffix = 2;
  // Unicidad: al editar se excluye el propio evento, igual que con el slug.
  while (await repo.skuExists(candidate, excludeId)) {
    const ending = `-${suffix++}`;
    candidate = `${base.slice(0, 180 - ending.length)}${ending}`;
  }
  return candidate;
};
const save = async (action) => {
  try { return await action(); }
  catch (error) {
    // PostgreSQL también protege la unicidad ante dos peticiones simultáneas.
    if (error.code === '23505') {
      if (error.constraint === 'events_sku_key') throw new AppError('Ya existe un evento con ese SKU.', 409);
      throw new AppError('Ya existe un evento con esos datos.', 409);
    }
    throw error;
  }
};
const validateEvent = async (data) => {
  const options = await getFormOptions();
  if (!options.experiences.some((item) => item.id === data.experienceId)) {
    throw new AppError('Selecciona una experiencia existente.', 400);
  }
  if (!options.locations.some((item) => item.id === data.locationId)) {
    throw new AppError('Selecciona un lugar existente.', 400);
  }
  if (!options.categories.some((item) => item.id === data.categoryId && item.experienceId === data.experienceId)) {
    throw new AppError('Selecciona una categoría asignada a esa experiencia.', 400);
  }
  // Fechas: los borradores heredados pueden no tenerlas; un evento programado sí las necesita.
  if ((data.startDatetime === null) !== (data.endDatetime === null)) {
    throw new AppError('Indica ambas fechas o deja ambas vacías.', 400);
  }
  if (data.status === 'scheduled' && !data.startDatetime) {
    throw new AppError('Un evento programado necesita fecha de inicio y fin.', 400);
  }
  if (data.startDatetime && (Number.isNaN(Date.parse(data.startDatetime))
    || Number.isNaN(Date.parse(data.endDatetime))
    || Date.parse(data.endDatetime) <= Date.parse(data.startDatetime))) {
    throw new AppError('La fecha de fin debe ser posterior a la de inicio.', 400);
  }
  return options.experiences.find((item) => item.id === data.experienceId);
};
const createEvent = async (data) => {
  const experience = await validateEvent(data);
  // El servidor genera el SKU; el cliente no puede escribirlo manualmente.
  return save(async () => repo.create({ ...data, sku: await buildUniqueSku(experience.name) }));
};
const updateEvent = async (id, data) => {
  const current = await getEventById(id);
  const merged = { ...current, ...data };
  const experience = await validateEvent(merged);
  const changes = { ...data };
  // El SKU se conserva al cambiar fechas o precios y se recalcula al cambiar de experiencia.
  if (data.experienceId && data.experienceId !== current.experienceId) {
    changes.sku = await buildUniqueSku(experience.name, id);
  }
  const event = await save(() => repo.update(id, changes));
  if (!event) throw new AppError('Evento no encontrado.', 404);
  return event;
};
const deleteEvent = async (id) => {
  const event = await repo.softDelete(id);
  if (!event) throw new AppError('Evento no encontrado.', 404);
  return event;
};
const setEventActive = async (id, isActive) => {
  await getEventById(id);
  // La BD valida las dependencias al activar y conserva el estado del evento al desactivar.
  const event = await save(() => repo.update(id, { isActive }));
  if (!event) throw new AppError('Evento no encontrado.', 404);
  return event;
};
module.exports = { getAllEvents, getFormOptions, getEventById, getEventBySku, createEvent, updateEvent, deleteEvent,
  activateEvent: (id) => setEventActive(id, true), deactivateEvent: (id) => setEventActive(id, false) };
