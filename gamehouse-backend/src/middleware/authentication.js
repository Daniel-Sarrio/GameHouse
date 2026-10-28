const { verifyToken } = require('../services/utils/jwt');
const { rateLimit } = require('express-rate-limit');
const users = require('../repos/users.repo');
const AppError = require('../services/utils/app-error');
const { z } = require('zod');

const authenticate = async (req, res, next) => {
  const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') || '');
  if (!match) return next(new AppError('Authentication required', 401));
  let payload;
  try {
    payload = verifyToken(match[1]);
    if (!z.uuid().safeParse(payload.sub).success || !Number.isFinite(payload.exp)) throw new Error('Invalid claims');
  } catch {
    return next(new AppError('Authentication required', 401));
  }
  try {
    const user = await users.findById(payload.sub);
    if (!user) return next(new AppError('Authentication required', 401));
    req.user = user;
    return next();
  } catch (error) { return next(error); }
};

const createLimiter = (limit) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Try again later.', errors: [] },
});

module.exports = { authenticate, loginLimiter: createLimiter(20), registerLimiter: createLimiter(10) };
