// Una departure es un evento programado y reservable de una experiencia.
class Departure {
  constructor({ id, sku, start_datetime, end_datetime, price, capacity, image_url,
    location_id, location_name, address, city, postal_code, country, category_id, category_name }) {
    this.id = id;
    this.sku = sku;
    this.startDatetime = start_datetime;
    this.endDatetime = end_datetime;
    this.price = Number(price);
    this.capacity = capacity;
    // Hasta que existan reservas, todas las plazas están libres. El sistema de reservas
    // solo tendrá que restar las plazas ocupadas en el repositorio.
    this.availableSpots = capacity;
    this.imageUrl = image_url;
    this.location = { id: location_id, name: location_name, address, city, postalCode: postal_code, country };
    this.category = { id: category_id, name: category_name };
  }
}
module.exports = Departure;
