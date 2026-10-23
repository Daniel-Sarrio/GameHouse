const { z } = require('zod');
const datetime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/, 'Usa una fecha y hora válidas.').nullable();
const fields = {
  experienceId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  startDatetime: datetime,
  endDatetime: datetime,
  price: z.number().finite().min(0),
  capacity: z.number().int().positive(),
  status: z.enum(['draft', 'scheduled', 'cancelled', 'completed']),
  imageUrl: z.string().url().nullable(),
};
const createEventSchema = z.strictObject(fields);
const updateEventSchema = z.strictObject(Object.fromEntries(
  Object.entries(fields).map(([key, schema]) => [key, schema.optional()]),
)).refine((data) => Object.keys(data).length > 0, 'Debes enviar al menos un campo.');
const idParamsSchema = z.object({ id: z.coerce.number().int().positive() });
// Igual que el slug: obligatorio, sin espacios en los extremos y hasta 180 caracteres.
const skuParamsSchema = z.object({ sku: z.string().trim().min(1).max(180) });
module.exports = { createEventSchema, updateEventSchema, idParamsSchema, skuParamsSchema };
