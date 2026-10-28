const service = require('../services/users.service');
const respond = (action, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await action(req) }); }
  catch (error) { next(error); }
};
module.exports = {
  active: respond(() => service.getActiveUsers()),
  deleted: respond((req) => service.getDeletedUsers(req.query)),
  create: respond((req) => service.createUser(req.body), 201),
  update: respond((req) => service.updateUser(req.params.id, req.body)),
  setActive: respond((req) => service.setActive(req.params.id, req.body)),
  softDelete: respond((req) => service.softDeleteUser(req.params.id)),
  list: respond((req) => service.listUsers(req.query)),
  get: respond((req) => service.getUser(req.params.id)),
};
