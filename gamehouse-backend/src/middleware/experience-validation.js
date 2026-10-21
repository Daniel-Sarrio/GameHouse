const { z } = require('zod');
const status = z.enum(['draft', 'published', 'archived', 'suspended']);
const fields = {
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).nullable(),
  imageUrl: z.string().url().nullable(),
  hostId: z.number().int().positive(),
  categoryIds: z.array(z.number().int().positive()).min(1, 'Selecciona al menos una categoría.'),
  status: status.default('published'),
  isActive: z.boolean().default(true),
};
const createExperienceSchema = z.strictObject(fields);
const updateExperienceSchema = z.strictObject(Object.fromEntries(
  Object.entries({ ...fields, status, isActive: z.boolean() }).map(([key, schema]) => [key, schema.optional()]),
)).refine((data) => Object.keys(data).length > 0, 'Debes enviar al menos un campo.');
const idParamsSchema = z.object({ id: z.coerce.number().int().positive() });
const slugParamsSchema = z.object({ slug: z.string().trim().min(1).max(180) });
module.exports = { createExperienceSchema, updateExperienceSchema, idParamsSchema, slugParamsSchema };
