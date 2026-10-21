const service = require('../services/hosts.service');

const respond = (action, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await action(req) }); }
  catch (error) { next(error); }
};

module.exports = {
  getAllHosts: respond(() => service.getAllHosts()),
  getHostById: respond((req) => service.getHostById(req.params.id)),
  getHostBySlug: respond((req) => service.getHostBySlug(req.params.slug)),
  createHost: respond((req) => service.createHost(req.body), 201),
  updateHost: respond((req) => service.updateHost(req.params.id, req.body)),
  activateHost: respond((req) => service.activateHost(req.params.id)),
  deactivateHost: respond((req) => service.deactivateHost(req.params.id)),
  deleteHost: respond((req) => service.deleteHost(req.params.id)),
};
