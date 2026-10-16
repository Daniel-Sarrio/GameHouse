# GameHouse Backend

API REST de experiencias gaming con Node.js, Express y PostgreSQL.

## Arquitectura

```text
route → ctrl → service → repo → PostgreSQL
                              ↓
                            model
```

- `routes`: URLs y middlewares de validación con Zod.
- `ctrls`: entrada y respuesta HTTP.
- `services`: reglas de negocio, slugs y errores controlados.
- `repos`: consultas SQL mediante `pg`.
- `models`: forma de los datos devueltos.
- `middleware`: validación, errores y rutas no encontradas.

Helmet añade cabeceras de seguridad y Morgan muestra cada petición en la terminal.

## Preparación

```bash
cd gamehouse-backend
npm install
npm run migrate
npm run seed
npm run dev
```

También puedes ejecutar `npm run seed` desde la raíz del proyecto. El comando aplica la migración y carga cuatro organizadores, cinco lugares, cinco categorías y ocho experiencias de prueba. Se puede repetir: los eventos que ya tengan el mismo slug se conservan sin duplicarse.

La tabla `images` permite asociar imágenes a cualquier registro mediante `entity_type` (nombre de la tabla, por ejemplo `experiences`, `hosts`, `locations` o `categories`) y `entity_id`. Tiene una imagen principal como máximo por registro. La migración copia las portadas y galerías existentes y mantiene sincronizadas las imágenes de las experiencias al crearlas o editarlas.
`locations.image_url` guarda además la imagen principal del lugar; la migración la rellena con las imágenes existentes y la mantiene sincronizada con `images`.

`npm run migrate` amplía la tabla existente sin borrar sus registros, genera slugs y crea los catálogos de organizadores, lugares y categorías. Conserva las experiencias existentes y les asigna sus relaciones. `npm run seed` añade tres experiencias de ejemplo con slugs definidos en `seed.js`; si alguno ya existe, el servicio añade un sufijo para mantenerlo único.

Configura `.env` a partir de `.env.example`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=GameHome
DB_USER=postgres
DB_PASSWORD=tu_contrasena
```

## Campos de una experiencia

Además de `id`, cada experiencia contiene `name`, `slug`, `description`, `location`, `country`, `city`, `price`, `currency`, `duration`, `capacity`, `coverImage`, `gallery`, `hostName`, `hostId`, `locationId`, `categoryIds`, `status`, `isActive`, `createdAt`, `updatedAt` y `deletedAt`.

El slug se genera automáticamente desde `name` y se hace único. El cliente no debe enviarlo. DELETE es un borrado lógico: rellena `deletedAt`, desactiva el evento y deja de mostrarlo en las consultas normales.

## Endpoints

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/api/experiences` | Listar las no eliminadas |
| GET | `/api/experiences/form-options` | Listar organizadores, lugares y categorías |
| GET | `/api/experiences/:id` | Consultar por ID |
| GET | `/api/experiences/slug/:slug` | Consultar por slug |
| POST | `/api/experiences` | Crear |
| PATCH | `/api/experiences/:id` | Actualizar campos enviados |
| PATCH | `/api/experiences/:id/activate` | Activar |
| PATCH | `/api/experiences/:id/deactivate` | Desactivar |
| DELETE | `/api/experiences/:id` | Borrado lógico |

Las respuestas correctas usan `{ "success": true, "data": ... }`. Los errores usan `{ "success": false, "message": "...", "errors": [] }`. Consulta ejemplos completos en `POSTMAN.md`.
