const router = require('express').Router();
const ctrl = require('../ctrls/roles.ctrl');
const validate = require('../middleware/validation.middleware');
const { roleSchema, updateRoleSchema, idParamsSchema } = require('../middleware/role-validation');

router.get('/', ctrl.getAllRoles);
router.get('/:id', validate({ params: idParamsSchema }), ctrl.getRoleById);
router.post('/', validate({ body: roleSchema }), ctrl.createRole);
router.patch('/:id', validate({ params: idParamsSchema, body: updateRoleSchema }), ctrl.updateRole);
router.patch('/:id/delete', validate({ params: idParamsSchema }), ctrl.deleteRole);
module.exports = router;
