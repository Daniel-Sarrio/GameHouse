class Location {
  constructor({ id, name, address, city, postal_code, country, image_url, deleted_at }) {
    this.id = id;
    this.name = name;
    this.address = address;
    this.city = city;
    this.postalCode = postal_code;
    this.country = country;
    this.imageUrl = image_url;
    this.deletedAt = deleted_at;
  }
}
module.exports = Location;
