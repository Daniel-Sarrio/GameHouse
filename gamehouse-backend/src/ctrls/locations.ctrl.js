const service = require('../services/locations.service');
const respond = (action, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await action(req) }); }
  catch (error) { next(error); }
};
module.exports = {
  getAllLocations: respond(() => service.getAllLocations()),
  getLocationById: respond((req) => service.getLocationById(req.params.id)),
  createLocation: respond((req) => service.createLocation(req.body), 201),
  updateLocation: respond((req) => service.updateLocation(req.params.id, req.body)),
  deleteLocation: respond((req) => service.deleteLocation(req.params.id)),
};
