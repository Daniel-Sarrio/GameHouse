const AppError = require('./app-error');

module.exports = (schema, data) => {
  const result = schema.safeParse(data);
  if (!result.success) throw new AppError('Error de validación.', 400,
    result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })));
  return result.data;
};
