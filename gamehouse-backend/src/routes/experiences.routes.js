const express = require('express');
const experiencesCtrl = require('../ctrls/experiences.ctrl');
const validate = require('../middleware/validation.middleware');
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
router.post('/', validate({ body: createExperienceSchema }), experiencesCtrl.createExperience);
router.patch('/:id', validate({ params: idParamsSchema, body: updateExperienceSchema }), experiencesCtrl.updateExperience);
router.patch('/:id/activate', validateId, experiencesCtrl.activateExperience);
router.patch('/:id/deactivate', validateId, experiencesCtrl.deactivateExperience);
router.delete('/:id', validateId, experiencesCtrl.deleteExperience);

module.exports = router;
