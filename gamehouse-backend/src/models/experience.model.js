class Experience {
  constructor({
    id, name, slug, description, location, country, city, price, currency,
    duration, capacity, cover_image, gallery, host_name, status, is_active,
    host_id, location_id, category_ids, category_names, created_at, updated_at, deleted_at,
  }) {
    this.id = id;
    this.name = name;
    this.slug = slug;
    this.description = description;
    this.location = location;
    this.country = country;
    this.city = city;
    this.price = Number(price);
    this.currency = currency;
    this.duration = duration;
    this.capacity = capacity;
    this.coverImage = cover_image;
    this.gallery = gallery || [];
    this.hostName = host_name;
    this.hostId = host_id;
    this.locationId = location_id;
    this.categoryIds = category_ids || [];
    this.categoryNames = category_names || [];
    this.status = status;
    this.isActive = is_active;
    this.createdAt = created_at;
    this.updatedAt = updated_at;
    this.deletedAt = deleted_at;
  }
}

module.exports = Experience;
