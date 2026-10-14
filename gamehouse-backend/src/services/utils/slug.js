const slugify = require('slugify');

const generateSlug = (value) => slugify(value, {
  lower: true,
  strict: true,
  trim: true,
});

module.exports = generateSlug;
