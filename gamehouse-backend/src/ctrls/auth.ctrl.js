const service = require('../services/auth.service');
module.exports = {
  register: async (req, res, next) => {
    try { res.status(201).json({ success: true, data: await service.register(req.body) }); }
    catch (error) { next(error); }
  },
  login: async (req, res, next) => {
    try { res.json({ success: true, data: await service.login(req.body) }); }
    catch (error) { next(error); }
  },
  me: async (req, res, next) => {
    try { res.json({ success: true, data: await service.me(req.user.id) }); }
    catch (error) { next(error); }
  },
  logout: async (req, res, next) => {
    try { res.json({ success: true, data: await service.logout(req.auth) }); }
    catch (error) { next(error); }
  },
};
