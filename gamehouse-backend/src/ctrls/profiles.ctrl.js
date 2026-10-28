const service = require('../services/profiles.service');
module.exports = {
  get: async (req, res, next) => {
    try { res.json({ success: true, data: await service.getProfile(req.user, req.params.id || 'me') }); }
    catch (error) { next(error); }
  },
  update: async (req, res, next) => {
    try { res.json({ success: true, data: await service.updateProfile(req.user, req.params.id || 'me', req.body) }); }
    catch (error) { next(error); }
  },
};
