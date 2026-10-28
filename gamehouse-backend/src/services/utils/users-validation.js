const { z } = require('zod');

const fields = {
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().max(255).pipe(z.email()),
  password: z.string().min(12).max(128),
  role: z.enum(['USER', 'ADMIN']),
  roleId: z.number().int().positive(),
  status: z.string().trim().min(1).max(30),
  avatarImageUrl: z.url({ protocol: /^https?$/ }).max(2048).nullable(),
};
const roleChoice = (data) => !(data.role !== undefined && data.roleId !== undefined);
const createUserSchema = z.strictObject({
  ...Object.fromEntries(Object.entries(fields).map(([key, schema]) => [key, schema.optional()])),
  email: fields.email, password: fields.password,
}).refine(roleChoice, 'Envía role o roleId, no ambos.');
const updateUserSchema = z.strictObject(Object.fromEntries(
  Object.entries(fields).map(([key, schema]) => [key, schema.optional()]),
)).refine(roleChoice, 'Envía role o roleId, no ambos.')
  .refine((data) => Object.keys(data).length > 0, 'Envía al menos un campo para modificar.');

module.exports = { createUserSchema, updateUserSchema, activeSchema: z.strictObject({ isActive: z.boolean() }) };
