const { z } = require('zod');
const { commentQuerySchema } = require('./comment-validation');

const id = z.coerce.number().int().positive().max(2147483647);

module.exports = {
  experienceIdParamsSchema: z.strictObject({ id }),
  commentIdParamsSchema: z.strictObject({ id }),
  // Mismos filtros que el listado público: page, limit y sort.
  reviewQuerySchema: commentQuerySchema,
};
