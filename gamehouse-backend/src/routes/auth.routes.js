const router = require('express').Router();
const ctrl = require('../ctrls/auth.ctrl');
const { authenticate, loginLimiter, registerLimiter, refreshLimiter } = require('../middleware/authentication');
const validate = require('../middleware/validation.middleware');
const { registerSchema, loginSchema } = require('../services/utils/auth-validation');

router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.post('/register', registerLimiter, validate({ body: registerSchema }), ctrl.register);
router.post('/login', loginLimiter, validate({ body: loginSchema }), ctrl.login);
router.get('/me', authenticate, ctrl.me);
// Usan la cookie de refresh (Path=/api/auth), no el access token, que puede haber caducado.
router.post('/refresh', refreshLimiter, ctrl.refresh);
router.post('/logout', ctrl.logout);
module.exports = router;
