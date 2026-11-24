// Likes a experiencias, montados en /api/likes. Todas las rutas exigen sesión.
const router = require('express').Router();
const ctrl = require('../ctrls/likes.ctrl');
const { authenticate, likeLimiter } = require('../middleware/authentication');
const validate = require('../middleware/validation.middleware');
const { slugParamsSchema } = require('../middleware/shop-validation');

// Sin access token válido, authenticate responde 401 y el cliente renueva la sesión con /api/auth/refresh.
router.use(authenticate);
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

router.get('/', ctrl.mine);
router.post('/:slug', likeLimiter, validate({ params: slugParamsSchema }), ctrl.like);
router.delete('/:slug', likeLimiter, validate({ params: slugParamsSchema }), ctrl.unlike);

module.exports = router;
