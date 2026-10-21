const { z } = require('zod');

// Nombre, ciudad y país son obligatorios en la base de datos.
const fields = {
  name: z.string().trim().min(1).max(150),
  address: z.string().trim().min(1).max(255),
  city: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(1).max(100),
  imageUrl: z.string().url().refine((url) => /^https?:\/\//i.test(url), 'Usa una URL http o https.').nullable(),
};
const createLocationSchema = z.strictObject(fields);
const updateLocationSchema = z.strictObject(Object.fromEntries(
  Object.entries(fields).map(([key, schema]) => [key, schema.optional()]),
)).refine((data) => Object.keys(data).length > 0, 'Debes enviar al menos un campo.');
const idParamsSchema = z.object({ id: z.coerce.number().int().positive() });
module.exports = { createLocationSchema, updateLocationSchema, idParamsSchema };
