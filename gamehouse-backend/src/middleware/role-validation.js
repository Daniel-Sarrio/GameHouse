const { z } = require('zod');
const roleSchema = z.strictObject({ name: z.string().trim().min(1).max(50) });
const idParamsSchema = z.object({ id: z.coerce.number().int().positive() });
module.exports = { roleSchema, idParamsSchema };
