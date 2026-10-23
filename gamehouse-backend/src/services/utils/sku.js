const slugify = require('slugify');

// Formato del SKU: sin tildes ni espacios, en mayúsculas y con un máximo de 180 caracteres.
const generateSku = (value) => slugify(value, {
  strict: true,
  trim: true,
}).toUpperCase().slice(0, 180).replace(/-+$/, '');

module.exports = generateSku;
