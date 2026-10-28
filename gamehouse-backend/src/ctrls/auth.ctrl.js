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
  me: (req, res) => res.json({ success: true, data: req.user }),
};
