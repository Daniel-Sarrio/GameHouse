class Experience {
  constructor({ id, name, slug, description, image_url, host_id, host_name,
    category_ids, category_names, event_count, status, is_active, created_at, updated_at, deleted_at }) {
    this.id = id;
    this.name = name;
    this.slug = slug;
    this.description = description;
    this.imageUrl = image_url;
    this.hostId = host_id;
    this.hostName = host_name;
    this.categoryIds = category_ids || [];
    this.categoryNames = category_names || [];
    this.eventCount = event_count;
    this.status = status;
    this.isActive = is_active;
    this.createdAt = created_at;
    this.updatedAt = updated_at;
    this.deletedAt = deleted_at;
  }
}
module.exports = Experience;
