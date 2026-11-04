const service = require('../services/auth.service');
const { setSessionCookie, clearSessionCookie } = require('../services/utils/auth-cookie');
const sessionResponse = (res, session) => {
  const { token, ...data } = session;
  return { ...data, expiresAt: setSessionCookie(res, token) };
};
module.exports = {
  register: async (req, res, next) => {
    try { res.status(201).json({ success: true, data: sessionResponse(res, await service.register(req.body)) }); }
    catch (error) { next(error); }
  },
  login: async (req, res, next) => {
    try { res.json({ success: true, data: sessionResponse(res, await service.login(req.body)) }); }
    catch (error) { next(error); }
  },
  me: async (req, res, next) => {
    try { res.json({ success: true, data: await service.me(req.user.id), expiresAt: req.auth.expiresAt.getTime() }); }
    catch (error) { next(error); }
  },
  logout: async (req, res, next) => {
    try {
      const data = await service.logout(req.auth);
      clearSessionCookie(res);
      res.json({ success: true, data });
    }
    catch (error) { next(error); }
  },
};
