// Experiencia publicada tal como se muestra en el shop (tarjeta y detalle).
class ShopExperience {
  constructor({ id, name, slug, description, image_url, host_id, host_name, host_slug, host_description,
    host_image_url, categories, locations, min_price, next_departure, departure_count, images }) {
    this.id = id;
    this.name = name;
    this.slug = slug;
    this.description = description;
    this.imageUrl = image_url;
    this.host = {
      id: host_id,
      name: host_name,
      slug: host_slug,
      ...(host_description !== undefined && { description: host_description }),
      ...(host_image_url !== undefined && { imageUrl: host_image_url }),
    };
    this.categories = categories || [];
    this.locations = locations || [];
    this.minPrice = min_price === null || min_price === undefined ? null : Number(min_price);
    this.nextDeparture = next_departure ?? null;
    this.departureCount = departure_count ?? 0;
    if (images !== undefined) this.images = images;
  }
}
module.exports = ShopExperience;
