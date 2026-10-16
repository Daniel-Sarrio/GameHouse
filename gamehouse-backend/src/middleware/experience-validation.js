const { z } = require('zod');

const status = z.enum(['draft', 'published', 'archived', 'suspended']);
const text = (field, min, max) => z.string()
  .trim()
  .min(min, `${field} debe tener al menos ${min} caracteres.`)
  .max(max, `${field} no puede superar ${max} caracteres.`);

const experienceFields = {
  name: text('name', 5, 120),
  description: text('description', 20, 2000),
  location: text('location', 2, 150),
  country: text('country', 2, 100),
  city: text('city', 2, 100),
  price: z.number().finite().min(0, 'price no puede ser negativo.'),
  currency: z.string().trim().length(3, 'currency debe tener 3 letras.').transform((value) => value.toUpperCase()),
  duration: z.number().int().positive('duration debe ser un entero positivo.'),
  capacity: z.number().int().positive('capacity debe ser un entero positivo.'),
  coverImage: z.string().url('coverImage debe ser una URL válida.'),
  gallery: z.array(z.string().url('Cada imagen de gallery debe ser una URL válida.')).default([]),
  hostName: text('hostName', 2, 100),
  hostId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  categoryIds: z.array(z.number().int().positive()).min(1, 'Selecciona al menos una categoría.'),
  status: status.default('published'),
  isActive: z.boolean().default(true),
};

const createExperienceSchema = z.strictObject(experienceFields);

const updateExperienceSchema = z.strictObject(
  Object.fromEntries(Object.entries(experienceFields).map(([key, schema]) => [key, schema.optional()])),
).refine((data) => Object.keys(data).length > 0, {
  message: 'Debes enviar al menos un campo para actualizar.',
});

const idParamsSchema = z.object({
  id: z.coerce.number().int().positive('El ID debe ser un entero positivo.'),
});

const slugParamsSchema = z.object({
  slug: z.string().trim().min(1, 'El slug es obligatorio.').max(180),
});

module.exports = {
  createExperienceSchema,
  updateExperienceSchema,
  idParamsSchema,
  slugParamsSchema,
};
