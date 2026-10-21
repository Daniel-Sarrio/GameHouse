const repo = require('../repos/locations.repo');
const AppError = require('./utils/app-error');

const getAllLocations = () => repo.findAll();
const getLocationById = async (id) => {
  const location = await repo.findById(id);
  if (!location) throw new AppError('Lugar no encontrado.', 404);
  return location;
};
const save = async (action) => {
  try { return await action(); }
  catch (error) {
    // La base de datos no permite repetir nombre, ciudad y país en dos lugares.
    if (error.code === '23505') throw new AppError('Ya existe un lugar con ese nombre, ciudad y país.', 409);
    throw error;
  }
};
const createLocation = (data) => save(() => repo.create(data));
const updateLocation = async (id, data) => {
  const location = await save(() => repo.update(id, data));
  if (!location) throw new AppError('Lugar no encontrado.', 404);
  return location;
};
const deleteLocation = async (id) => {
  try {
    const location = await repo.remove(id);
    if (!location) throw new AppError('Lugar no encontrado.', 404);
    return location;
  } catch (error) {
    // Un lugar usado por eventos no se puede borrar: primero hay que cambiar su lugar.
    if (error.code === '23503') throw new AppError('Este lugar está asociado a eventos. Cambia su lugar antes de eliminarlo.', 409);
    throw error;
  }
};
module.exports = { getAllLocations, getLocationById, createLocation, updateLocation, deleteLocation };
