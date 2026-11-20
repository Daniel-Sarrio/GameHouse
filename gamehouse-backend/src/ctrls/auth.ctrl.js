const service = require('../services/auth.service');
const { setAuthCookies, clearAuthCookies, readAuthCookies } = require('../services/utils/auth-cookie');

// Los tokens solo viajan en cookies HttpOnly: el JSON nunca incluye tokens ni sus caducidades.
const sessionResponse = (res, { user, tokens }) => {
  setAuthCookies(res, tokens);
  return { user };
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
    try { res.json({ success: true, data: service.toSessionUser(req.user) }); }
    catch (error) { next(error); }
  },
  refresh: async (req, res, next) => {
    try {
      const tokens = await service.refresh(readAuthCookies(req).refreshToken);
      if (tokens) setAuthCookies(res, tokens);
      res.json({ success: true, data: { message: 'Sesión renovada.' } });
    } catch (error) {
      // Un refresh rechazado deja al cliente sin sesión: no se conservan cookies inservibles.
      if (error.statusCode === 401) clearAuthCookies(res);
      next(error);
    }
  },
  logout: async (req, res, next) => {
    try {
      const data = await service.logout(readAuthCookies(req));
      clearAuthCookies(res);
      res.json({ success: true, data });
    }
    catch (error) { next(error); }
  },
};
