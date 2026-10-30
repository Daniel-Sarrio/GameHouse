# GameHouse Backend

API REST de GameHouse con Node.js, Express y PostgreSQL.

Se mantiene CommonJS (`require`/`module.exports`) y la arquitectura existente. La API devuelve propiedades en camelCase; PostgreSQL usa snake_case.

La seguridad se organiza en `src/services/utils/jwt.js` (firma y verificación de tokens), `src/middleware/authentication.js` (autenticación y límites de intentos) y `src/middleware/authorization.js` (roles, propiedad y permisos de escritura). Los esquemas de validación de autenticación están en `src/services/utils/auth-validation.js`; se reutiliza el middleware general de validación.

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
# Configura .env antes de continuar (ver variables al final).
npm run migrate
npm run seed
npm run dev
```

`npm seed` desde la raíz también aplica la migración y carga los datos de prueba. Migración y seed se pueden ejecutar varias veces sin duplicar eventos programados.

Puedes ejecutar `npm start` tanto desde `GameHouse` como desde `gamehouse-backend`. El servidor siempre carga el `.env` de `gamehouse-backend`. Inicia una sola instancia: si el puerto 3000 está ocupado por otra instancia de GameHouse, usa esa instancia o detenla con Ctrl+C en su terminal antes de volver a arrancar. Para comprobar la API, abre `http://localhost:3000/api/events`; la raíz `/` no sirve el frontend.

## Modelo de datos

- `experiences` es el catálogo reutilizable: nombre, descripción, imagen, organizador, categorías y estado. El slug se genera a partir del nombre.
- `events` es cada celebración concreta: experiencia, lugar, categoría, inicio, fin, precio, capacidad, imagen y estado. Una experiencia puede tener varios eventos con precios, lugares y fechas diferentes.
- `experience_categories` relaciona las categorías permitidas para cada experiencia. Al crear un evento, su categoría debe pertenecer a esa experiencia.
- `locations` guarda nombre, dirección, ciudad, código postal, país e imagen. Dirección y código postal pueden ser nulos en los registros anteriores a la migración.
- `hosts`, `categories` y `roles` conservan sus endpoints. `hosts.user_id` es UUID y puede ser nulo. `roles` conserva USER/ADMIN/HOST; para asignar o reactivar un usuario, su rol debe existir, estar activo y no eliminado. Los permisos de autenticación siguen limitados a USER/ADMIN.
- `images` permite asociar imágenes a cualquier tabla mediante `entity_type` y `entity_id`.
- `users` contiene UUID, email único sin distinguir mayúsculas, `password_hash`, rol USER/ADMIN, `is_active`, `deleted_at`, `last_login_at`, `status` y fechas `TIMESTAMPTZ`. Conserva las referencias históricas en bases migradas.
- `profiles` contiene `id` UUID, `user_id` UUID obligatorio y único, `first_name`, `last_name`, `phone`, `avatar_url`, `created_at` y `updated_at`. El perfil se elimina al borrar su usuario (`ON DELETE CASCADE`). Las fechas usan `TIMESTAMPTZ`; el repositorio actualiza `updated_at` en cada modificación.

`npm run migrate:auth` aplica las migraciones de autenticación, perfiles y gestión de usuarios. También se ejecutan desde `npm run migrate`. Primero se copian los datos personales al perfil; después `002_auth.sql` convierte usuarios y sus referencias a UUID, manteniendo `legacy_id` y `legacy_role_id` para trazabilidad. Los antiguos ADMIN conservan su permiso; HOST pasa a USER para autenticación. Se conservan los hashes anteriores y se convierten las contraseñas antiguas en texto plano a Argon2id. Una colisión de emails o referencia desconocida cancela la transacción para revisión manual. Las fechas antiguas se interpretan en la zona horaria configurada en PostgreSQL.

`npm run migrate:profiles` sigue disponible y admite tanto el esquema antiguo como el nuevo. Los registros nuevos crean usuario y perfil en una única transacción. Las migraciones se pueden repetir.

La migración convierte los registros antiguos con lugar y precio en eventos borrador. Como no existían fechas en esos registros, `start_datetime` y `end_datetime` quedan nulos hasta que se programen. `duration_minutes` conserva su duración anterior. El seed crea eventos programados de ejemplo; incluye dos celebraciones del mismo torneo FC27 con diferentes precios y capacidades.

`database.sql` define el esquema para una base nueva. `migrate.js` adapta una base existente y conserva sus registros.

Para una base vacía, aplica primero `database.sql` con tu cliente PostgreSQL. No ejecutes ese archivo sobre una base que ya contiene las tablas.

## Endpoints

| Recurso | Rutas principales |
| --- | --- |
| Experiencias | `GET /api/experiences`, `GET /api/experiences/:id`, `GET /api/experiences/slug/:slug`, `GET /api/experiences/form-options`, `POST /api/experiences`, `PATCH /api/experiences/:id`, `PATCH /api/experiences/:id/delete` |
| Eventos | `GET /api/events`, `GET /api/events/:id`, `GET /api/events/form-options`, `POST /api/events`, `PATCH /api/events/:id`, `PATCH /api/events/:id/delete` |
| Lugares | `GET /api/locations`, `GET /api/locations/:id`, `POST /api/locations`, `PATCH /api/locations/:id`, `PATCH /api/locations/:id/delete` |
| Categorías | `/api/categories` |
| Organizadores | `/api/hosts` |
| Roles | `/api/roles` |
| Autenticación | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Perfiles | `GET /api/profiles/me`, `PATCH /api/profiles/me`, `GET /api/profiles/:id`, `PATCH /api/profiles/:id` |
| Usuarios (ADMIN) | `GET /api/users`, `GET /api/users/active`, `GET /api/users/deleted`, `GET /api/users/:id`, `POST /api/users`, `PATCH /api/users/:id`, `PATCH /api/users/:id/active`, `PATCH /api/users/:id/softdelete` |

Las respuestas correctas usan `{ "success": true, "data": ... }`. Los errores usan `{ "success": false, "message": "...", "errors": [] }`.

Configura `.env` a partir de `.env.example`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=GameHome
DB_USER=postgres
DB_PASSWORD=tu_contrasena
JWT_SECRET=<secreto-aleatorio-de-al-menos-32-bytes>
JWT_EXPIRES_IN=1h
CORS_ORIGINS=http://localhost:4200
```

Genera `JWT_SECRET` con `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` y guárdalo solo en `.env`, excluido de Git. El servidor rechaza secretos ausentes o demasiado cortos. `JWT_EXPIRES_IN` acepta duraciones positivas con unidad (`30m`, `1h`, `7d`). `CORS_ORIGINS` es una lista de orígenes exactos separados por comas. Las peticiones sin Origin, como Postman, siguen permitidas.

## Autenticación y permisos

- Registro: email, password de 12 a 128 caracteres y, opcionalmente, firstName, lastName, phone y avatarUrl. Rechaza campos adicionales, incluido role. Siempre crea USER.
- Login: devuelve `data.token` y `data.user`. Las contraseñas nuevas usan Argon2id; un login correcto con bcrypt antiguo actualiza el hash. No se devuelven hashes.
- Enviar `Authorization: Bearer <token>` en las rutas protegidas. JWT usa HS256, emisor y audiencia fijos, subject UUID y expiración obligatoria. El payload incluye `role` (USER o ADMIN) al emitir el token. Para comprobar permisos se consulta el rol actual en PostgreSQL en cada petición; eliminar el usuario invalida sus tokens.
- USER consulta y modifica su perfil. ADMIN accede a cualquier perfil y a `/api/users`. `:id` en perfiles identifica el perfil, no el usuario.
- Las lecturas de catálogos siguen disponibles. Las escrituras de eventos, categorías, organizadores, lugares y asignaciones, la creación de experiencias y todas las rutas de roles requieren ADMIN.
- Editar, activar, desactivar o eliminar una experiencia requiere ADMIN o que `experiences.host_id` apunte a un organizador cuyo `hosts.user_id` sea el usuario autenticado. Solo ADMIN puede cambiar el organizador.
- Los registros y logins tienen límites separados por IP: 10 y 20 intentos por 15 minutos, respectivamente. Responden 429 con Retry-After. El almacén es local al proceso: para varias instancias debe sustituirse por un almacén compartido. `trust proxy` permanece desactivado; configúralo con los proxies concretos de tu despliegue si los hay.

Para preparar el primer administrador, registra la cuenta y cambia su rol desde una sesión autorizada de PostgreSQL:

```sql
UPDATE users SET role = 'ADMIN', updated_at = CURRENT_TIMESTAMP
WHERE lower(email) = lower('tu-correo@example.com');
```

El cambio tiene efecto con el token existente. No hay credenciales ni administrador de ejemplo. El frontend deberá enviar el token en sus operaciones administrativas.

## Borrado lógico

El botón Eliminar envía `PATCH /api/<recurso>/:id/delete` con `{}` para experiencias, eventos, categorías, organizadores (`hosts`), lugares y roles. Para asignaciones usa `PATCH /api/assignments/:experienceId/:categoryId/delete`. Estas rutas conservan los permisos existentes; ya no hay endpoints DELETE.

Se asigna `deleted_at` sin eliminar filas, imágenes ni referencias. Los registros de catálogo dejan de aparecer en listas, detalles y selectores; consultarlos, editarlos, activarlos o eliminarlos otra vez devuelve 404. Los eventos eliminados dejan de contarse en su experiencia. Organizador, experiencia, categoría o lugar eliminados desactivan los eventos dependientes sin borrarlos. No se permite renombrar o eliminar roles utilizados por usuarios no eliminados, ni desactivar roles con usuarios activos.

Retirar una categoría de una experiencia también conserva la asignación con `deleted_at`. Volver a asignarla restaura esa fila, sin reactivar automáticamente sus eventos. Los nombres, slugs, SKU y demás claves únicas de registros eliminados siguen reservados; no hay pantalla de papelera/restauración general.

Aplica `npm run migrate:soft-delete` para actualizar una base existente. También se incluye en `npm run migrate`; `database.sql` ya incorpora las columnas y triggers para instalaciones nuevas. El seed respeta los registros eliminados.

## Gestión de usuarios en PostgreSQL

Las rutas están en `src/routes/user.routes.js`, montadas en `/api/users`; sustituye a `admin.routes.js` y `/api/admin/users`. Todas requieren ADMIN. Se mantienen CommonJS, `pg.Pool`, consultas parametrizadas y UUID; no se usa Mongoose.

- `GET /api/users` lista activos, desactivados y eliminados, ordenados por nombre. Admite `limit` (1–100, por defecto 50) y `offset`. `GET /deleted` usa la misma paginación.
- `GET /active` devuelve únicamente `id`, `name` y `email` de usuarios activos no eliminados, para selectores de organizadores.
- `GET /:id` y `PATCH /:id` solo acceden a usuarios activos no eliminados; los demás devuelven 404.
- `POST /` requiere email y password; admite name, role o roleId, status y avatarImageUrl. La contraseña usa Argon2id. Usuario, perfil y avatar se guardan en una transacción. Solo el registro público está restringido siempre a USER; ADMIN puede crear USER o ADMIN.
- `PATCH /:id` admite esos mismos campos de forma parcial, con password opcional. Un cuerpo vacío o campos internos como passwordHash, isActive o deletedAt devuelven 400. Un email duplicado devuelve 409, incluso si pertenece a un usuario eliminado.
- `PATCH /:id/active` recibe `{ "isActive": true }` o false. Desactivar está bloqueado si gestiona organizadores activos. Reactivar requiere un rol activo. Un usuario eliminado devuelve 409; uno inexistente, 404.
- `PATCH /:id/softdelete` desactiva y establece deletedAt, conservando usuario, perfil y avatar. Se bloquea si tiene organizadores no eliminados, aunque estén desactivados. Repetir el borrado devuelve 404 y conserva su fecha original.

`name` y `avatarImageUrl` se adaptan a `profiles`: el nombre completo se guarda en `first_name` y `last_name` queda nulo al editarlo desde este endpoint; la respuesta compone `name` y devuelve `avatarUrl` y `profileId`. No se duplica el avatar en `images`, cuyo `entity_id` actual es entero. `avatarImageUrl: null` quita el avatar. `roleId` es el ID entero del catálogo y se resuelve a `users.role`; solo se admiten USER/ADMIN. No envíes role y roleId simultáneamente. `status` es una etiqueta descriptiva de hasta 30 caracteres (por defecto active); el acceso depende de isActive y deletedAt, no de esa etiqueta.

Login actualiza lastLoginAt. Usuarios desactivados o eliminados reciben 401 al iniciar sesión o utilizar un token anterior. Una reactivación puede volver a permitir un token que aún no haya caducado. El borrado lógico no tiene ruta de restauración.

`npm run migrate:users` aplica únicamente `004_user_lifecycle.sql` y las reglas de integridad de usuarios. Añade campos sin borrar datos ni cambiar contraseñas; también forma parte de `migrate` y `migrate:auth`. El esquema nuevo incluye los roles USER y ADMIN sin crear cuentas de ejemplo. `PATCH /api/roles/:id` permite cambiar isActive; las reglas de uso se comprueban también en PostgreSQL.

## Pruebas de integración

`npm test` ejecuta pruebas HTTP y PostgreSQL con el runner de Node.js. Requiere acceso a la base configurada y permiso para crear esquemas. Usa esquemas aleatorios `auth_test_*` que elimina al terminar; no modifica las tablas de la aplicación. Comprueba registro, duplicados, rol, login, JWT, RBAC, ABAC, rollback, migración de datos antiguos, cascada, validación, CORS, límites de intentos y rutas existentes. Los ejemplos de peticiones están en `POSTMAN.md`.
