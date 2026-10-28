const router = require('express').Router();
const ctrl = require('../ctrls/profiles.ctrl');
const { authenticate } = require('../middleware/authentication');
const validate = require('../middleware/validation.middleware');
const { profileSchema, uuidParamsSchema } = require('../services/utils/auth-validation');

router.use(authenticate);
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.get('/me', ctrl.get);
router.patch('/me', validate({ body: profileSchema }), ctrl.update);
router.get('/:id', validate({ params: uuidParamsSchema }), ctrl.get);
router.patch('/:id', validate({ params: uuidParamsSchema, body: profileSchema }), ctrl.update);
module.exports = router;
