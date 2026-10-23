class Event {
  constructor({ id, sku, experience_id, experience_name, experience_slug, location_id, location_name, city, country,
    category_id, category_name, start_datetime, end_datetime, price, capacity, status,
    image_url, duration_minutes, legacy_experience_id, created_at, updated_at }) {
    this.id = id;
    this.sku = sku;
    this.experienceId = experience_id;
    this.experienceName = experience_name;
    this.experienceSlug = experience_slug;
    this.locationId = location_id;
    this.locationName = location_name;
    this.city = city;
    this.country = country;
    this.categoryId = category_id;
    this.categoryName = category_name;
    this.startDatetime = start_datetime;
    this.endDatetime = end_datetime;
    this.price = Number(price);
    this.capacity = capacity;
    this.status = status;
    this.imageUrl = image_url;
    this.durationMinutes = duration_minutes;
    this.legacyExperienceId = legacy_experience_id;
    this.createdAt = created_at;
    this.updatedAt = updated_at;
  }
}
module.exports = Event;
