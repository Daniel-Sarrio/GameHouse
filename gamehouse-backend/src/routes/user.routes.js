const router = require('express').Router();
const ctrl = require('../ctrls/users.ctrl');
const { authenticate } = require('../middleware/authentication');
const { authorizeRoles } = require('../middleware/authorization');
const validate = require('../middleware/validation.middleware');
const { uuidParamsSchema, paginationSchema } = require('../services/utils/auth-validation');
const { createUserSchema, updateUserSchema, activeSchema } = require('../services/utils/users-validation');

router.use(authenticate, authorizeRoles('ADMIN'));
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.get('/', validate({ query: paginationSchema }), ctrl.list);
router.get('/active', ctrl.active);
router.get('/deleted', validate({ query: paginationSchema }), ctrl.deleted);
router.get('/:id', validate({ params: uuidParamsSchema }), ctrl.get);
router.post('/', validate({ body: createUserSchema }), ctrl.create);
router.patch('/:id/active', validate({ params: uuidParamsSchema, body: activeSchema }), ctrl.setActive);
router.patch('/:id/softdelete', validate({ params: uuidParamsSchema }), ctrl.softDelete);
router.patch('/:id', validate({ params: uuidParamsSchema, body: updateUserSchema }), ctrl.update);
module.exports = router;
