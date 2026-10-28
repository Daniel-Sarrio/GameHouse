const repo = require('../repos/roles.repo');
const AppError = require('./utils/app-error');
const Role = require('../models/role.model');
const usersRepo = require('../repos/users.repo');

// La misma restricción se aplica al crear y al editar, aunque se llame al servicio directamente.
const validateRole = (data) => {
  if (data.name !== undefined && !Role.allowedNames.includes(data.name)) {
    throw new AppError('El rol solo puede ser USER, ADMIN o HOST.', 400);
  }
};

const getAllRoles = () => repo.findAll();
const getRoleById = async (id) => {
  const role = await repo.findById(id);
  if (!role) throw new AppError('Rol no encontrado.', 404);
  return role;
};
const save = async (action) => {
  try { return await action(); }
  catch (error) {
    if (error.code === '23514' && error.constraint === 'roles_allowed_name') {
      throw new AppError('El rol solo puede ser USER, ADMIN o HOST.', 400);
    }
    if (error.code === '23505') throw new AppError('Ya existe un rol con ese nombre.', 409);
    if (error.code === '23503') throw new AppError('Este rol está en uso y no se puede eliminar.', 409);
    throw error;
  }
};
const createRole = async (data) => {
  validateRole(data);
  return save(() => repo.create(data));
};
const updateRole = async (id, data) => {
  validateRole(data);
  const current = await getRoleById(id);
  if (data.name !== undefined && data.name !== current.name && await usersRepo.countByRole(current.name)) {
    throw new AppError('No se puede renombrar un rol con usuarios no eliminados.', 409);
  }
  if (data.isActive === false && await usersRepo.countByRole(current.name, true)) {
    throw new AppError('No se puede desactivar un rol con usuarios activos.', 409);
  }
  const role = await save(() => repo.update(id, data));
  if (!role) throw new AppError('Rol no encontrado.', 404);
  return role;
};
const deleteRole = async (id) => {
  const current = await getRoleById(id);
  if (await usersRepo.countByRole(current.name)) throw new AppError('No se puede eliminar un rol con usuarios no eliminados.', 409);
  const role = await save(() => repo.softDelete(id));
  if (!role) throw new AppError('Rol no encontrado.', 404);
  return role;
};
module.exports = { getAllRoles, getRoleById, createRole, updateRole, deleteRole };
