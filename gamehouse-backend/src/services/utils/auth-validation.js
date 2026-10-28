const { z } = require('zod');
const profileFields = {
  firstName: z.string().trim().min(1).max(100).nullable().optional(),
  lastName: z.string().trim().min(1).max(100).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  avatarUrl: z.url({ protocol: /^https?$/ }).max(2048).nullable().optional(),
};
const email = z.email().trim().toLowerCase().max(255);
const password = z.string().min(12).max(128);

module.exports = {
  registerSchema: z.strictObject({ email, password, ...profileFields }),
  loginSchema: z.strictObject({ email, password: z.string().min(1).max(128) }),
  profileSchema: z.strictObject(profileFields).refine((data) => Object.keys(data).length > 0, 'Send at least one field'),
  uuidParamsSchema: z.strictObject({ id: z.uuid() }),
  paginationSchema: z.strictObject({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).max(1000000).default(0),
  }),
};
