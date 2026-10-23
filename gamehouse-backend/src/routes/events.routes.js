const router = require('express').Router();
const ctrl = require('../ctrls/events.ctrl');
const validate = require('../middleware/validation.middleware');
const { createEventSchema, updateEventSchema, idParamsSchema, skuParamsSchema } = require('../middleware/event-validation');

router.get('/', ctrl.getAllEvents);
router.get('/form-options', ctrl.getFormOptions);
router.get('/sku/:sku', validate({ params: skuParamsSchema }), ctrl.getEventBySku);
router.get('/:id', validate({ params: idParamsSchema }), ctrl.getEventById);
router.post('/', validate({ body: createEventSchema }), ctrl.createEvent);
router.patch('/:id', validate({ params: idParamsSchema, body: updateEventSchema }), ctrl.updateEvent);
router.delete('/:id', validate({ params: idParamsSchema }), ctrl.deleteEvent);
module.exports = router;
