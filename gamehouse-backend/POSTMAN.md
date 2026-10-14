# Probar GameHouse con Postman

Ejecuta primero `npm run migrate` y `npm run dev`. La URL base es `http://localhost:3000/api/experiences`.

## Crear

`POST /api/experiences` con Body → raw → JSON:

```json
{
  "name": "Simulador de carreras",
  "description": "Compite en circuitos virtuales con volante, pedales y asistencia del equipo.",
  "location": "GameHouse Racing Zone",
  "country": "España",
  "city": "Valencia",
  "price": 18.5,
  "currency": "EUR",
  "duration": 45,
  "capacity": 4,
  "coverImage": "https://picsum.photos/seed/simulador/1200/800",
  "gallery": ["https://picsum.photos/seed/simulador-1/1200/800"],
  "hostName": "Equipo GameHouse",
  "status": "published",
  "isActive": true
}
```

La respuesta `201` incluye el `id`, el `slug` generado y las fechas.

## Consultar

- `GET /api/experiences`: lista experiencias no eliminadas.
- `GET /api/experiences/1`: consulta por ID.
- `GET /api/experiences/slug/simulador-de-carreras`: consulta por slug.

## Actualizar

`PATCH /api/experiences/1` permite enviar uno o varios campos:

```json
{
  "price": 20,
  "capacity": 6
}
```

Si se cambia `name`, el backend vuelve a generar un slug único.

## Activar, desactivar y eliminar

- `PATCH /api/experiences/1/activate`
- `PATCH /api/experiences/1/deactivate`
- `DELETE /api/experiences/1`

DELETE no borra la fila de PostgreSQL: asigna `deleted_at`, `is_active = false` y `status = "archived"`. Después, los endpoints GET dejan de devolverla.

Un body inválido devuelve `400` y un array `errors` con cada campo incorrecto. Un ID o slug que no exista devuelve `404`.
