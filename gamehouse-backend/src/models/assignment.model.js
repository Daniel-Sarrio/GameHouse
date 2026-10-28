class Assignment {
  constructor({ experience_id, category_id, experience_name, category_name, deleted_at }) {
    this.experienceId = experience_id;
    this.categoryId = category_id;
    this.experienceName = experience_name;
    this.categoryName = category_name;
    this.deletedAt = deleted_at;
  }
}
module.exports = Assignment;
