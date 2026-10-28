const { z } = require('zod');
const Role = require('../models/role.model');
const roleSchema = z.strictObject({
  name: z.enum(Role.allowedNames, { error: 'El rol solo puede ser USER, ADMIN o HOST.' }),
  isActive: z.boolean().optional(),
});
const updateRoleSchema = roleSchema.partial().refine((data) => Object.keys(data).length > 0, 'Envía al menos un campo.');
const idParamsSchema = z.object({ id: z.coerce.number().int().positive() });
module.exports = { roleSchema, updateRoleSchema, idParamsSchema };
