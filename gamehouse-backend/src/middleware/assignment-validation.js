const { z } = require('zod');
// Ambas referencias son obligatorias y deben ser identificadores enteros positivos.
const assignmentSchema = z.strictObject({
  experienceId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
});
const assignmentParamsSchema = z.object({
  experienceId: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive(),
});
module.exports = { assignmentSchema, assignmentParamsSchema };
