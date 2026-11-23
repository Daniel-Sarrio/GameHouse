// Comentarios de una experiencia, montados en /api/shop/experiences/:slug/comments.
const router = require('express').Router({ mergeParams: true });
const ctrl = require('../ctrls/comments.ctrl');
const { authenticate, optionalAuthenticate, commentLimiter } = require('../middleware/authentication');
const validate = require('../middleware/validation.middleware');
const { slugParamsSchema } = require('../middleware/shop-validation');
const { commentBodySchema, commentQuerySchema, commentParamsSchema } = require('../middleware/comment-validation');

// La respuesta depende del usuario (canDelete): ningún proxy ni caché compartida debe guardarla.
router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });

// Leer es público; con sesión se marca qué comentarios puede borrar el usuario.
router.get('/', optionalAuthenticate, validate({ params: slugParamsSchema, query: commentQuerySchema }), ctrl.list);
// Escribir y borrar exigen sesión: authenticate responde 401 sin access token válido.
router.post('/', authenticate, commentLimiter, validate({ params: slugParamsSchema, body: commentBodySchema }), ctrl.create);
router.delete('/:id', authenticate, validate({ params: commentParamsSchema }), ctrl.remove);

module.exports = router;
