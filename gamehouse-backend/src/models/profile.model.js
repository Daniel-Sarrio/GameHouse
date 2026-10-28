class Profile {
  constructor({ id, user_id, first_name, last_name, phone, avatar_url, created_at, updated_at }) {
    this.id = id;
    this.userId = user_id;
    this.firstName = first_name;
    this.lastName = last_name;
    this.phone = phone;
    this.avatarUrl = avatar_url;
    this.createdAt = created_at;
    this.updatedAt = updated_at;
  }
}
module.exports = Profile;
