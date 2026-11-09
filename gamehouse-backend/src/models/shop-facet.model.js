// Categoría, organizador o lugar mostrado en el home y en los filtros del shop.
// Solo expone datos públicos: nunca email, teléfono ni usuario del organizador.
class ShopFacet {
  constructor({ id, name, slug, description, image_url, city, country, experience_count }) {
    this.id = id;
    this.name = name;
    this.slug = slug ?? null;
    this.description = description ?? null;
    this.imageUrl = image_url ?? null;
    if (city !== undefined) this.city = city;
    if (country !== undefined) this.country = country;
    this.experienceCount = experience_count;
  }
}
module.exports = ShopFacet;
