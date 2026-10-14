const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const message = error.isOperational
    ? error.message
    : 'Error interno del servidor';

  if (!error.isOperational) console.error(error);

  res.status(statusCode).json({
    success: false,
    message,
    errors: error.errors || [],
  });
};

module.exports = errorHandler;
