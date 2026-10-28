const router = require('express').Router();
const ctrl = require('../ctrls/assignments.ctrl');
const validate = require('../middleware/validation.middleware');
const { assignmentSchema, assignmentParamsSchema } = require('../middleware/assignment-validation');

router.get('/', ctrl.getAllAssignments);
router.get('/:experienceId/:categoryId', validate({ params: assignmentParamsSchema }), ctrl.getAssignmentById);
router.post('/', validate({ body: assignmentSchema }), ctrl.createAssignment);
router.patch('/:experienceId/:categoryId', validate({ params: assignmentParamsSchema, body: assignmentSchema }), ctrl.updateAssignment);
router.patch('/:experienceId/:categoryId/delete', validate({ params: assignmentParamsSchema }), ctrl.deleteAssignment);
module.exports = router;
