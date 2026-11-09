const { z } = require('zod');

const MAX_FILTER_VALUES = 20;

// Acepta ?category=1,2 y ?category=1&category=2. Cualquier otra forma (objetos de qs) se rechaza.
const idList = z.preprocess((value) => {
  if (value === undefined || value === '') return [];
  const parts = (Array.isArray(value) ? value : [value]).flatMap((item) => (typeof item === 'string' ? item.split(',') : [item]));
  return parts.map((item) => (typeof item === 'string' ? item.trim() : item)).filter((item) => item !== '');
}, z.array(z.coerce.number().int().positive()).max(MAX_FILTER_VALUES, `Máximo ${MAX_FILTER_VALUES} valores por filtro.`))
  .transform((ids) => [...new Set(ids)]);

const SHOP_SORTS = ['recent', 'name', 'price_asc', 'price_desc', 'date'];

const shopQuerySchema = z.strictObject({
  category: idList,
  host: idList,
  location: idList,
  search: z.string().trim().max(100).optional().transform((value) => value || undefined),
  sort: z.enum(SHOP_SORTS).default('recent'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

const slugParamsSchema = z.object({ slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9-]+$/) });

module.exports = { shopQuerySchema, slugParamsSchema, SHOP_SORTS };
