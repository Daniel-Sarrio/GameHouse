# Ejemplos de API para Postman

La experiencia es genérica y puede reutilizarse en varios eventos.

## Crear experiencia

`POST /api/experiences`

```json
{
  "name": "Torneo FC27",
  "description": "Torneo presencial con varias rondas y premios.",
  "imageUrl": "https://picsum.photos/seed/fc27/1200/800",
  "hostId": 1,
  "categoryIds": [1],
  "status": "published",
  "isActive": true
}
```

Los IDs deben existir en la base de datos. Consulta `GET /api/experiences/form-options` para organizadores y categorías.

## Crear evento

`POST /api/events`

```json
{
  "experienceId": 5,
  "locationId": 1,
  "categoryId": 1,
  "startDatetime": "2026-11-20T18:00",
  "endDatetime": "2026-11-20T21:00",
  "price": 15,
  "capacity": 32,
  "status": "scheduled",
  "imageUrl": "https://picsum.photos/seed/fc27-valencia/1200/800"
}
```

Consulta `GET /api/events/form-options` para las experiencias, lugares y categorías permitidas. Otra fila con el mismo `experienceId` puede tener lugar, fechas, precio y capacidad distintos. Los eventos `scheduled` requieren dos fechas válidas; los borradores pueden guardarse sin fechas.
