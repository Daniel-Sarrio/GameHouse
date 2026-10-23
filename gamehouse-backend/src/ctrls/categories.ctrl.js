const service = require('../services/categories.service');

// Cada controlador envía sus errores al middleware común mediante next(error).
const getAllCategories = async (req, res, next) => {
  try {
    const data = await service.getAllCategories();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const data = await service.getCategoryById(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getCategoryBySlug = async (req, res, next) => {
  try {
    const data = await service.getCategoryBySlug(req.params.slug);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const data = await service.createCategory(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const data = await service.updateCategory(req.params.id, req.body);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const activateCategory = async (req, res, next) => {
  try {
    const data = await service.activateCategory(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const deactivateCategory = async (req, res, next) => {
  try {
    const data = await service.deactivateCategory(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const data = await service.deleteCategory(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  activateCategory,
  deactivateCategory,
  deleteCategory,
};
