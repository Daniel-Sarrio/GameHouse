const service = require('../services/events.service');
const respond = (action, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await action(req) }); }
  catch (error) { next(error); }
};
module.exports = {
  getAllEvents: respond(() => service.getAllEvents()),
  getFormOptions: respond(() => service.getFormOptions()),
  getEventById: respond((req) => service.getEventById(req.params.id)),
  createEvent: respond((req) => service.createEvent(req.body), 201),
  updateEvent: respond((req) => service.updateEvent(req.params.id, req.body)),
  deleteEvent: respond((req) => service.deleteEvent(req.params.id)),
};
