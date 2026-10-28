const users = require('../repos/users.repo');
const AppError = require('./utils/app-error');
const pool = require('../config/database');
const profiles = require('../repos/profiles.repo');
const hosts = require('../repos/hosts.repo');
const { hashPassword } = require('./utils/password');
const { z } = require('zod');

const validateId = (id) => {
  if (!z.uuid().safeParse(id).success) throw new AppError('El id del usuario no es válido.', 400);
};
const getUser = async (id) => {
  validateId(id);
  const user = await users.findById(id);
  if (!user) throw new AppError('Resource not found', 404);
  return user;
};
const transaction = async (action) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await action(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') throw new AppError('Ya existe un usuario con ese email.', 409);
    throw error;
  } finally { client.release(); }
};
const resolveRole = async (data, client, fallback = 'USER') => {
  const role = await users.findRole(data.roleId !== undefined ? { roleId: data.roleId } : { role: data.role ?? fallback }, client);
  if (!role || !['USER', 'ADMIN'].includes(role.name)) {
    throw new AppError('El rol indicado no existe, está desactivado o no permite autenticación.', 400);
  }
  return role.name;
};
const validateEmail = async (email, id, client) => {
  if (email && await users.emailExists(email, id, client)) throw new AppError('Ya existe un usuario con ese email.', 409);
};
const profileData = (body) => ({
  ...(body.name === undefined ? {} : { firstName: body.name, lastName: null }),
  ...(body.avatarImageUrl === undefined ? {} : { avatarUrl: body.avatarImageUrl }),
});
const createUser = async (body) => {
  const passwordHash = await hashPassword(body.password);
  return transaction(async (client) => {
    await validateEmail(body.email, null, client);
    const role = await resolveRole(body, client);
    const user = await users.create(client, body.email, passwordHash, { role, status: body.status });
    await profiles.create(client, user.id, profileData(body));
    return users.findById(user.id, client);
  });
};
const updateUser = async (id, body) => {
  validateId(id);
  if (!['name', 'email', 'password', 'role', 'roleId', 'status', 'avatarImageUrl'].some((field) => body[field] !== undefined)) {
    throw new AppError('No se ha enviado ningún campo válido para modificar.', 400);
  }
  const passwordHash = body.password === undefined ? undefined : await hashPassword(body.password);
  return transaction(async (client) => {
    const current = await users.lockById(client, id);
    if (!current || !current.is_active || current.deleted_at) throw new AppError('Usuario no encontrado.', 404);
    await validateEmail(body.email, id, client);
    const changes = {};
    for (const field of ['email', 'status']) if (body[field] !== undefined) changes[field] = body[field];
    if (passwordHash !== undefined) changes.passwordHash = passwordHash;
    if (body.role !== undefined || body.roleId !== undefined) changes.role = await resolveRole(body, client);
    await users.update(client, id, changes);
    const changesToProfile = profileData(body);
    if (Object.keys(changesToProfile).length) {
      const profile = await profiles.findByUserId(id, client);
      if (profile) await profiles.update(profile.id, changesToProfile, client);
      else await profiles.create(client, id, changesToProfile);
    }
    return users.findById(id, client);
  });
};
const setActive = async (id, { isActive }) => {
  validateId(id);
  if (typeof isActive !== 'boolean') throw new AppError('isActive debe ser true o false.', 400);
  return transaction(async (client) => {
    const current = await users.lockById(client, id);
    if (!current) throw new AppError('Usuario no encontrado.', 404);
    if (current.deleted_at) throw new AppError('El usuario está eliminado y no se puede activar ni desactivar.', 409);
    if (!isActive && await hosts.countByUser(id, true, client)) {
      throw new AppError('No se puede desactivar: gestiona organizadores activos. Desactívalos o desvincula el usuario primero.', 409);
    }
    if (isActive && !await users.findRole({ role: current.role }, client)) {
      throw new AppError('No se puede activar: su rol está desactivado o eliminado.', 409);
    }
    return users.setActive(client, id, isActive);
  });
};
const softDeleteUser = async (id) => {
  validateId(id);
  return transaction(async (client) => {
    const current = await users.lockById(client, id);
    if (!current || current.deleted_at) throw new AppError('Usuario no encontrado.', 404);
    if (await hosts.countByUser(id, false, client)) {
      throw new AppError('No se puede eliminar: gestiona organizadores. Desvincula el usuario primero.', 409);
    }
    return users.softDelete(client, id);
  });
};
module.exports = { getUser, listUsers: (query) => users.findAll(query),
  getActiveUsers: () => users.findActive(), getDeletedUsers: (query) => users.findDeleted(query),
  createUser, updateUser, setActive, softDeleteUser };
