// Opiniones en el panel de administración, montadas en /api/reviews. Solo ADMIN.
const router = require('express').Router();
const ctrl = require('../ctrls/reviews.ctrl');
const { authenticate, analysisLimiter } = require('../middleware/authentication');
const { authorizeRoles } = require('../middleware/authorization');
const validate = require('../middleware/validation.middleware');
const { experienceIdParamsSchema, commentIdParamsSchema, reviewQuerySchema } = require('../middleware/review-validation');

router.use(authenticate, authorizeRoles('ADMIN'));
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

router.get('/experiences', ctrl.experiences);
router.get('/experiences/:id/comments', validate({ params: experienceIdParamsSchema, query: reviewQuerySchema }), ctrl.comments);
router.get('/experiences/:id/analysis', validate({ params: experienceIdParamsSchema }), ctrl.analysis);
// Cada análisis es una llamada al modelo: se limita aunque solo lo use el administrador.
router.post('/experiences/:id/analysis', analysisLimiter, validate({ params: experienceIdParamsSchema }), ctrl.analyze);
router.delete('/comments/:id', validate({ params: commentIdParamsSchema }), ctrl.removeComment);

module.exports = router;
