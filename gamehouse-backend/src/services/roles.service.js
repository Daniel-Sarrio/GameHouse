const repo = require('../repos/roles.repo');
const AppError = require('./utils/app-error');

const getAllRoles = () => repo.findAll();
const getRoleById = async (id) => {
  const role = await repo.findById(id);
  if (!role) throw new AppError('Rol no encontrado.', 404);
  return role;
};
const save = async (action) => {
  try { return await action(); }
  catch (error) {
    if (error.code === '23505') throw new AppError('Ya existe un rol con ese nombre.', 409);
    if (error.code === '23503') throw new AppError('Este rol está en uso y no se puede eliminar.', 409);
    throw error;
  }
};
const createRole = (data) => save(() => repo.create(data));
const updateRole = async (id, data) => {
  const role = await save(() => repo.update(id, data));
  if (!role) throw new AppError('Rol no encontrado.', 404);
  return role;
};
const deleteRole = async (id) => {
  const role = await save(() => repo.remove(id));
  if (!role) throw new AppError('Rol no encontrado.', 404);
  return role;
};
module.exports = { getAllRoles, getRoleById, createRole, updateRole, deleteRole };
