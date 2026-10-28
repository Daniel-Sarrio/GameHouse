class Role {
  static allowedNames = ['USER', 'ADMIN', 'HOST'];

  constructor({ id, name, is_active, deleted_at }) {
    this.id = id;
    this.name = name;
    this.isActive = is_active;
    this.deletedAt = deleted_at ?? null;
  }
}
module.exports = Role;
