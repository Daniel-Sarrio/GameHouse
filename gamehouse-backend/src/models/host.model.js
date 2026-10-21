class Host {
  constructor({ id, name, slug, description, image_url, email, phone,
    status, is_active, created_at, updated_at, deleted_at }) {
    this.id = id;
    this.name = name;
    this.slug = slug;
    this.description = description;
    this.imageUrl = image_url;
    this.email = email;
    this.phone = phone;
    this.status = status;
    this.isActive = is_active;
    this.createdAt = created_at;
    this.updatedAt = updated_at;
    this.deletedAt = deleted_at;
  }
}

module.exports = Host;
