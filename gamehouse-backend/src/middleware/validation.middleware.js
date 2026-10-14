const AppError = require('../services/utils/app-error');

const validate = (schemas) => (req, res, next) => {
  const errors = [];

  for (const [part, schema] of Object.entries(schemas)) {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      errors.push(...result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })));
    } else {
      req[part] = result.data;
    }
  }

  if (errors.length) {
    return next(new AppError('Error de validación.', 400, errors));
  }

  return next();
};

module.exports = validate;
