# GameHouse Backend

API REST de GameHouse con Node.js, Express y PostgreSQL.

## Arquitectura

```text
route → ctrl → service → repo → PostgreSQL
                              ↓
                            model
```

## Preparación

```bash
cd gamehouse-backend
npm install
npm run migrate
npm run seed
npm run dev
```

`npm seed` desde la raíz también aplica la migración y carga los datos de prueba. Migración y seed se pueden ejecutar varias veces sin duplicar eventos programados.

## Modelo de datos

- `experiences` es el catálogo reutilizable: nombre, descripción, imagen, organizador, categorías y estado. El slug se genera a partir del nombre.
- `events` es cada celebración concreta: experiencia, lugar, categoría, inicio, fin, precio, capacidad, imagen y estado. Una experiencia puede tener varios eventos con precios, lugares y fechas diferentes.
- `experience_categories` relaciona las categorías permitidas para cada experiencia. Al crear un evento, su categoría debe pertenecer a esa experiencia.
- `locations` guarda nombre, dirección, ciudad, código postal, país e imagen. Dirección y código postal pueden ser nulos en los registros anteriores a la migración.
- `hosts`, `categories`, `roles` y `users` son los demás catálogos. `hosts.user_id` puede ser nulo en organizadores anteriores a la migración.
- `images` permite asociar imágenes a cualquier tabla mediante `entity_type` y `entity_id`.

La migración convierte los registros antiguos con lugar y precio en eventos borrador. Como no existían fechas en esos registros, `start_datetime` y `end_datetime` quedan nulos hasta que se programen. `duration_minutes` conserva su duración anterior. El seed crea eventos programados de ejemplo; incluye dos celebraciones del mismo torneo FC27 con diferentes precios y capacidades.

`database.sql` define el esquema para una base nueva. `migrate.js` adapta una base existente y conserva sus registros.

## Endpoints

| Recurso | Rutas principales |
| --- | --- |
| Experiencias | `GET /api/experiences`, `GET /api/experiences/:id`, `GET /api/experiences/slug/:slug`, `GET /api/experiences/form-options`, `POST /api/experiences`, `PATCH /api/experiences/:id`, `DELETE /api/experiences/:id` |
| Eventos | `GET /api/events`, `GET /api/events/:id`, `GET /api/events/form-options`, `POST /api/events`, `PATCH /api/events/:id`, `DELETE /api/events/:id` |
| Lugares | `GET /api/locations`, `GET /api/locations/:id`, `POST /api/locations`, `PATCH /api/locations/:id`, `DELETE /api/locations/:id` |
| Categorías | `/api/categories` |
| Organizadores | `/api/hosts` |
| Roles | `/api/roles` |

Las respuestas correctas usan `{ "success": true, "data": ... }`. Los errores usan `{ "success": false, "message": "...", "errors": [] }`.

Configura `.env` a partir de `.env.example`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=GameHome
DB_USER=postgres
DB_PASSWORD=tu_contrasena
```
