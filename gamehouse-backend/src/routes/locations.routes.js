const router = require('express').Router();
const ctrl = require('../ctrls/locations.ctrl');
const validate = require('../middleware/validation.middleware');
const { createLocationSchema, updateLocationSchema, idParamsSchema } = require('../middleware/location-validation');

router.get('/', ctrl.getAllLocations);
router.get('/:id', validate({ params: idParamsSchema }), ctrl.getLocationById);
router.post('/', validate({ body: createLocationSchema }), ctrl.createLocation);
router.patch('/:id', validate({ params: idParamsSchema, body: updateLocationSchema }), ctrl.updateLocation);
router.delete('/:id', validate({ params: idParamsSchema }), ctrl.deleteLocation);
module.exports = router;
