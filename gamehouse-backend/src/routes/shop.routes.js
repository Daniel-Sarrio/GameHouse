const router = require('express').Router();
const ctrl = require('../ctrls/shop.ctrl');
const validate = require('../middleware/validation.middleware');
const { shopQuerySchema, slugParamsSchema } = require('../middleware/shop-validation');

const validateSlug = validate({ params: slugParamsSchema });

// Catálogo público: solo lectura, sin autenticación y únicamente con datos publicados.
router.get('/categories', ctrl.getCategories);
router.get('/hosts', ctrl.getHosts);
router.get('/locations', ctrl.getLocations);
router.get('/experiences', validate({ query: shopQuerySchema }), ctrl.getExperiences);
router.get('/experiences/:slug', validateSlug, ctrl.getExperienceBySlug);
router.get('/experiences/:slug/departures', validateSlug, ctrl.getDepartures);

module.exports = router;
