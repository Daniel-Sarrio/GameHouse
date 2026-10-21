const express = require('express');
const ctrl = require('../ctrls/hosts.ctrl');
const validate = require('../middleware/validation.middleware');
const { createHostSchema, updateHostSchema, idParamsSchema, slugParamsSchema } = require('../middleware/host-validation');

const router = express.Router();
const validateId = validate({ params: idParamsSchema });
router.get('/', ctrl.getAllHosts);
router.get('/slug/:slug', validate({ params: slugParamsSchema }), ctrl.getHostBySlug);
router.get('/:id', validateId, ctrl.getHostById);
router.post('/', validate({ body: createHostSchema }), ctrl.createHost);
router.patch('/:id', validate({ params: idParamsSchema, body: updateHostSchema }), ctrl.updateHost);
router.patch('/:id/activate', validateId, ctrl.activateHost);
router.patch('/:id/deactivate', validateId, ctrl.deactivateHost);
router.delete('/:id', validateId, ctrl.deleteHost);

module.exports = router;
