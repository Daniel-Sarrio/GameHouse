const express = require('express');
const ctrl = require('../ctrls/categories.ctrl');
const validate = require('../middleware/validation.middleware');
const { createCategorySchema, updateCategorySchema, idParamsSchema, slugParamsSchema } = require('../middleware/category-validation');

const router = express.Router();
const validateId = validate({ params: idParamsSchema });
router.get('/', ctrl.getAllCategories);
router.get('/slug/:slug', validate({ params: slugParamsSchema }), ctrl.getCategoryBySlug);
router.get('/:id', validateId, ctrl.getCategoryById);
router.post('/', validate({ body: createCategorySchema }), ctrl.createCategory);
router.patch('/:id', validate({ params: idParamsSchema, body: updateCategorySchema }), ctrl.updateCategory);
router.patch('/:id/activate', validateId, ctrl.activateCategory);
router.patch('/:id/deactivate', validateId, ctrl.deactivateCategory);
router.patch('/:id/delete', validateId, ctrl.deleteCategory);

module.exports = router;
