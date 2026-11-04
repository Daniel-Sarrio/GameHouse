const service = require('../services/auth.service');
const { name, clearSessionCookie } = require('../services/utils/auth-cookie');
const { rateLimit } = require('express-rate-limit');
const AppError = require('../services/utils/app-error');

const authenticate = async (req, res, next) => {
  const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') || '');
  const token = req.cookies?.[name] || match?.[1];
  if (!token) return next(new AppError('Authentication required', 401));
  try {
    const { user, expiresAt } = await service.validateSession(token);
    req.user = user;
    req.auth = { token, expiresAt };
    return next();
  } catch (error) {
    // Un 401 de una petición antigua no debe borrar una cookie de login más reciente.
    if (error.statusCode === 401 && req.cookies?.[name]
      && req.baseUrl === '/api/auth' && req.path === '/logout') clearSessionCookie(res);
    return next(error);
  }
};

const createLimiter = (limit) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Try again later.', errors: [] },
});

module.exports = { authenticate, loginLimiter: createLimiter(20), registerLimiter: createLimiter(10) };
