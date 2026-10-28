const repo = require('../repos/assignments.repo');
const experiencesRepo = require('../repos/experiences.repo');
const categoriesRepo = require('../repos/categories.repo');
const AppError = require('./utils/app-error');

const getAllAssignments = () => repo.findAll();
const getAssignmentById = async (experienceId, categoryId) => {
  const assignment = await repo.findById(experienceId, categoryId);
  if (!assignment) throw new AppError('Asignación no encontrada.', 404);
  return assignment;
};
const validateReferences = async (data) => {
  // Solo permite asignar categorías y experiencias que existen y no están eliminadas.
  if (!await experiencesRepo.findById(data.experienceId)) throw new AppError('Experiencia no encontrada.', 404);
  if (!await categoriesRepo.findById(data.categoryId)) throw new AppError('Categoría no encontrada.', 404);
};
const save = async (action) => {
  try { return await action(); }
  catch (error) {
    // La clave de la tabla es la pareja experiencia/categoría: no admite duplicados.
    if (error.code === '23505') throw new AppError('Esta categoría ya está asignada a la experiencia.', 409);
    if (error.code === '23503') throw new AppError('La experiencia o categoría ya no existe.', 409);
    throw error;
  }
};
const createAssignment = async (data) => {
  await validateReferences(data);
  return save(() => repo.create(data));
};
const updateAssignment = async (experienceId, categoryId, data) => {
  await getAssignmentById(experienceId, categoryId);
  await validateReferences(data);
  const assignment = await save(() => repo.update(experienceId, categoryId, data));
  if (!assignment) throw new AppError('Asignación no encontrada.', 404);
  return assignment;
};
const deleteAssignment = async (experienceId, categoryId) => {
  await getAssignmentById(experienceId, categoryId);
  const assignment = await repo.softDelete(experienceId, categoryId);
  if (!assignment) throw new AppError('Asignación no encontrada.', 404);
  return assignment;
};
module.exports = { getAllAssignments, getAssignmentById, createAssignment, updateAssignment, deleteAssignment };
