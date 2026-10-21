const { z } = require('zod');

const fields = {
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).nullable(),
  imageUrl: z.string().url().nullable(),
  email: z.email().nullable(),
  phone: z.string().trim().max(30).nullable(),
  status: z.enum(['draft', 'published', 'archived', 'suspended']).default('published'),
  isActive: z.boolean().default(true),
};
const createHostSchema = z.strictObject(fields);
const updateHostSchema = z.strictObject(
  Object.fromEntries(Object.entries(fields).map(([key, schema]) => [key, schema.optional()])),
).refine((data) => Object.keys(data).length > 0, { message: 'Debes enviar al menos un campo.' });
const idParamsSchema = z.object({ id: z.coerce.number().int().positive() });
const slugParamsSchema = z.object({ slug: z.string().trim().min(1).max(180) });

module.exports = { createHostSchema, updateHostSchema, idParamsSchema, slugParamsSchema };
