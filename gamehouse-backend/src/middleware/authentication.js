const service = require('../services/auth.service');
const { readAuthCookies } = require('../services/utils/auth-cookie');
const { rateLimit } = require('express-rate-limit');
const AppError = require('../services/utils/app-error');

// Solo se acepta el access token de la cookie HttpOnly: el JavaScript del cliente nunca lo ve.
// Un 401 indica al cliente que debe renovar la sesión con POST /api/auth/refresh.
const authenticate = async (req, res, next) => {
  const { accessToken } = readAuthCookies(req);
  if (!accessToken) return next(new AppError('Authentication required', 401));
  try {
    const { user, sessionId } = await service.validateSession(accessToken);
    req.user = user;
    req.auth = { sessionId };
    return next();
  } catch (error) { return next(error); }
};

// Para lecturas públicas que cambian con la sesión: sin access token válido sigue como anónimo, sin 401.
const optionalAuthenticate = async (req, res, next) => {
  const { accessToken } = readAuthCookies(req);
  if (!accessToken) return next();
  try {
    const { user, sessionId } = await service.validateSession(accessToken);
    req.user = user;
    req.auth = { sessionId };
  } catch (error) {
    if (error.statusCode !== 401) return next(error);
  }
  return next();
};

const createLimiter = (limit) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Try again later.', errors: [] },
});

module.exports = {
  authenticate,
  optionalAuthenticate,
  loginLimiter: createLimiter(20),
  // Frena el spam de comentarios: 30 por cada 15 minutos.
  commentLimiter: createLimiter(30),
  registerLimiter: createLimiter(10),
  // Con un access token de 1 h, un uso legítimo apenas renueva; el límite frena la fuerza bruta.
  refreshLimiter: createLimiter(60),
};
