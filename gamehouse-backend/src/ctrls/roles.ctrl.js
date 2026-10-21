const service = require('../services/roles.service');
const respond = (action, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await action(req) }); }
  catch (error) { next(error); }
};
module.exports = {
  getAllRoles: respond(() => service.getAllRoles()),
  getRoleById: respond((req) => service.getRoleById(req.params.id)),
  createRole: respond((req) => service.createRole(req.body), 201),
  updateRole: respond((req) => service.updateRole(req.params.id, req.body)),
  deleteRole: respond((req) => service.deleteRole(req.params.id)),
};
