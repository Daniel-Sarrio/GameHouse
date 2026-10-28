class User {
  constructor({ id, email, role, role_id, first_name, last_name, avatar_url, profile_id,
    is_active, deleted_at, status, last_login_at, created_at, updated_at }) {
    this.id = id;
    this.email = email;
    this.role = role;
    this.roleId = role_id ?? null;
    this.name = [first_name, last_name].filter(Boolean).join(' ');
    this.avatarUrl = avatar_url ?? null;
    this.profileId = profile_id ?? null;
    this.isActive = is_active;
    this.deletedAt = deleted_at ?? null;
    this.status = status;
    this.lastLoginAt = last_login_at ?? null;
    this.createdAt = created_at;
    this.updatedAt = updated_at;
  }
}
module.exports = User;
