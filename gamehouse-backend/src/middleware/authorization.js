const AppError = require('../services/utils/app-error');
const repo = require('../repos/experiences.repo');
const { canModifyExperience } = require('../services/utils/permissions');
const { authenticate } = require('./authentication');

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  if (!roles.includes(req.user.role)) return next(new AppError('You do not have permission to access this resource', 403));
  return next();
};

const authorizeOwnership = async (req, res, next) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  try {
    const resource = await repo.findOwnership(req.params.id);
    if (!resource) throw new AppError('Resource not found', 404);
    if (!canModifyExperience(req.user, resource)) throw new AppError('You do not have permission to access this resource', 403);
    // Solo ADMIN puede transferir una experiencia a otro organizador.
    if (req.user.role !== 'ADMIN' && req.body?.hostId !== undefined && req.body.hostId !== resource.hostId) {
      throw new AppError('You do not have permission to access this resource', 403);
    }
    return next();
  } catch (error) { return next(error); }
};

const admin = authorizeRoles('ADMIN');
const adminWrites = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  return authenticate(req, res, (error) => error ? next(error) : admin(req, res, next));
};

module.exports = { authorizeRoles, authorizeOwnership, adminWrites };
