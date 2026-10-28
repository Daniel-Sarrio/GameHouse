const errorHandler = (error, req, res, next) => {
  // Estas restricciones de la BD son reglas de negocio, también si falla una cascada.
  const activityConflict = error.code === '23514' && [
    'experience_active_host', 'event_active_dependencies', 'event_active_category_assignment',
    'user_has_hosts', 'user_has_active_hosts', 'host_valid_user', 'role_has_users', 'role_has_active_users',
  ].includes(error.constraint);
  const invalidJson = error.type === 'entity.parse.failed';
  const tooLarge = error.type === 'entity.too.large';
  const statusCode = invalidJson ? 400 : tooLarge ? 413 : activityConflict ? 409 : error.isOperational ? error.statusCode : 500;
  const message = error.isOperational || activityConflict
    ? error.message
    : invalidJson ? 'Invalid JSON' : tooLarge ? 'Request body too large' : 'Internal server error';

  if (!error.isOperational && !activityConflict && !invalidJson && !tooLarge) {
    console.error('Request failed:', { code: error.code, name: error.name });
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: error.isOperational ? error.errors || [] : [],
  });
};

module.exports = errorHandler;
