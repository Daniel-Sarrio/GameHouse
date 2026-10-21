const repo = require('../repos/events.repo');
const AppError = require('./utils/app-error');

const getAllEvents = () => repo.findAll();
const getFormOptions = () => repo.getFormOptions();
const getEventById = async (id) => {
  const event = await repo.findById(id);
  if (!event) throw new AppError('Evento no encontrado.', 404);
  return event;
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
};
const createEvent = async (data) => {
  await validateEvent(data);
  return repo.create(data);
};
const updateEvent = async (id, data) => {
  const current = await getEventById(id);
  const merged = { ...current, ...data };
  await validateEvent(merged);
  const event = await repo.update(id, data);
  if (!event) throw new AppError('Evento no encontrado.', 404);
  return event;
};
const deleteEvent = async (id) => {
  const event = await getEventById(id);
  await repo.remove(id);
  return event;
};
module.exports = { getAllEvents, getFormOptions, getEventById, createEvent, updateEvent, deleteEvent };
