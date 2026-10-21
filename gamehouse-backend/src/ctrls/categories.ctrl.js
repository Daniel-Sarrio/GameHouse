const service = require('../services/categories.service');

const respond = (action, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await action(req) }); }
  catch (error) { next(error); }
};

module.exports = {
  getAllCategories: respond(() => service.getAllCategories()),
  getCategoryById: respond((req) => service.getCategoryById(req.params.id)),
  getCategoryBySlug: respond((req) => service.getCategoryBySlug(req.params.slug)),
  createCategory: respond((req) => service.createCategory(req.body), 201),
  updateCategory: respond((req) => service.updateCategory(req.params.id, req.body)),
  activateCategory: respond((req) => service.activateCategory(req.params.id)),
  deactivateCategory: respond((req) => service.deactivateCategory(req.params.id)),
  deleteCategory: respond((req) => service.deleteCategory(req.params.id)),
};
