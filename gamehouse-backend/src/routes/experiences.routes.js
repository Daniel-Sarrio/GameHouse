const express = require('express');
const experiencesCtrl = require('../ctrls/experiences.ctrl');
const validate = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/authentication');
const { authorizeRoles, authorizeOwnership } = require('../middleware/authorization');
const {
  createExperienceSchema,
  updateExperienceSchema,
  idParamsSchema,
  slugParamsSchema,
} = require('../middleware/experience-validation');

const router = express.Router();
const validateId = validate({ params: idParamsSchema });

router.get('/', experiencesCtrl.getAllExperiences);
router.get('/form-options', experiencesCtrl.getFormOptions);
router.get('/slug/:slug', validate({ params: slugParamsSchema }), experiencesCtrl.getExperienceBySlug);
router.get('/:id', validateId, experiencesCtrl.getExperienceById);
router.post('/', authenticate, authorizeRoles('ADMIN'), validate({ body: createExperienceSchema }), experiencesCtrl.createExperience);
router.patch('/:id', authenticate, validate({ params: idParamsSchema, body: updateExperienceSchema }), authorizeOwnership, experiencesCtrl.updateExperience);
router.patch('/:id/activate', authenticate, validateId, authorizeOwnership, experiencesCtrl.activateExperience);
router.patch('/:id/deactivate', authenticate, validateId, authorizeOwnership, experiencesCtrl.deactivateExperience);
router.patch('/:id/delete', authenticate, validateId, authorizeOwnership, experiencesCtrl.deleteExperience);

module.exports = router;
