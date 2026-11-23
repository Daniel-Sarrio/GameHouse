const { z } = require('zod');
const { slugParamsSchema } = require('./shop-validation');

const COMMENT_MAX_LENGTH = 1000;

// Solo se aceptan la valoración y el texto: el autor y la experiencia salen de la sesión y de la URL.
const commentBodySchema = z.strictObject({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(1, 'El comentario no puede estar vacío.').max(COMMENT_MAX_LENGTH),
});

const commentQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const commentParamsSchema = slugParamsSchema.extend({ id: z.coerce.number().int().positive().max(2147483647) });

module.exports = { commentBodySchema, commentQuerySchema, commentParamsSchema, COMMENT_MAX_LENGTH };
