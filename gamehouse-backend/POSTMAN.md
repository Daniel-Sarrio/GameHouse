# Ejemplos de API para Postman

La experiencia es genérica y puede reutilizarse en varios eventos.

## Autenticación

Usa una variable `baseUrl` con valor `http://localhost:4000` (el API Gateway, que reenvía al backend). Para peticiones JSON selecciona Body → raw → JSON. Las operaciones administrativas de los ejemplos posteriores requieren una sesión ADMIN. Postman conserva la cookie del servidor. Añade `X-Requested-With: XMLHttpRequest` a las escrituras con cookie.

### Registro

`POST {{baseUrl}}/api/auth/register`

```json
{
  "email": "daniel@example.com",
  "password": "Una-clave-larga-y-unica-2026!",
  "firstName": "Daniel",
  "lastName": "Ejemplo",
  "phone": "+34600000000",
  "avatarUrl": null
}
```

Devuelve 201 con `data.user` (`id`, `email`, `name`, `role`, `avatarUrl`) y las cookies HttpOnly `gamehouse_access` y `gamehouse_refresh`. En Scripts → Post-response puedes guardar el id del usuario (el del perfil se obtiene con `GET /api/profiles/me`):

```javascript
if (pm.response.code === 201) {
  pm.environment.set('userId', pm.response.json().data.user.id);
}
```

Repetir el email devuelve 409. Añadir `"role": "ADMIN"` devuelve 400 y no crea la cuenta.

### Login

`POST {{baseUrl}}/api/auth/login`

```json
{
  "email": "daniel@example.com",
  "password": "Una-clave-larga-y-unica-2026!"
}
```

Devuelve 200 con `data.user`; credenciales incorrectas devuelven 401. Los tokens se envían exclusivamente en `Set-Cookie` (`gamehouse_access`, 1 h, y `gamehouse_refresh`, 7 días), nunca en JSON. Deja que Postman gestione las cookies para las siguientes peticiones.

### Renovar la sesión

Cuando una ruta protegida devuelve 401 porque el access token caducó, envía `POST {{baseUrl}}/api/auth/refresh` con `X-Requested-With: XMLHttpRequest` y sin cuerpo. Devuelve 200 y rota ambas cookies. Si devuelve 401, la sesión ha terminado: inicia sesión de nuevo.

### Cerrar sesión

Envía `POST {{baseUrl}}/api/auth/logout` con la cookie de sesión y `X-Requested-With: XMLHttpRequest`. No necesita cuerpo. Devuelve siempre 200 con `success: true` y `data.message`. La sesión queda revocada: su access token y su refresh token devuelven 401, incluso tras reiniciar el backend. Otras sesiones siguen siendo válidas.

La respuesta elimina ambas cookies automáticamente.

### Usuario y perfil propios

- `GET {{baseUrl}}/api/auth/me`
- `GET {{baseUrl}}/api/profiles/me`
- `GET {{baseUrl}}/api/profiles/{{profileId}}`
- `PATCH {{baseUrl}}/api/profiles/me`

Cuerpo de PATCH:

```json
{
  "firstName": "Daniel actualizado",
  "phone": null,
  "avatarUrl": "https://example.com/avatar.png"
}
```

También puedes usar `PATCH {{baseUrl}}/api/profiles/{{profileId}}`. Campos admitidos: firstName, lastName, phone y avatarUrl. Un cuerpo vacío o campos como userId, user_id o role devuelven 400. Sin token o con token inválido/caducado: 401. Con otro usuario: 403. UUID válido inexistente: 404.

### Administración

Con una cuenta promovida a ADMIN desde PostgreSQL según `README.md`:

- `GET {{baseUrl}}/api/users?limit=20&offset=0`
- `GET {{baseUrl}}/api/users/{{userId}}`
- `GET {{baseUrl}}/api/profiles/{{profileId}}` de otro usuario.
- `PATCH {{baseUrl}}/api/profiles/{{profileId}}` de otro usuario con el cuerpo anterior.

Un token USER recibe 403 en las rutas administrativas. Los hashes nunca aparecen en las respuestas. Para probar propiedad, registra una segunda cuenta y conserva sus IDs antes de volver a usar el token de la primera.

## Comentarios de una experiencia

Listar es público: `GET {{baseUrl}}/api/shop/experiences/{{slug}}/comments?page=1&limit=10` devuelve los comentarios, la media y el reparto por estrellas.

Para comentar inicia sesión antes (las cookies las gestiona Postman) y envía `POST {{baseUrl}}/api/shop/experiences/{{slug}}/comments` con `X-Requested-With: XMLHttpRequest`:

```json
{
  "rating": 5,
  "body": "Muy buen ambiente y bien organizado."
}
```

Devuelve 201. Sin sesión devuelve 401; una valoración fuera de 1-5, un texto vacío o campos extra como `userId` devuelven 400. Para borrar: `DELETE {{baseUrl}}/api/shop/experiences/{{slug}}/comments/{{commentId}}` con `X-Requested-With`; solo el autor o un ADMIN (si no, 403).

## Gestión completa de usuarios (ADMIN)

La ruta base es `{{baseUrl}}/api/users` y todos estos ejemplos usan la cookie de sesión de un ADMIN.

```http
GET {{baseUrl}}/api/users?limit=50&offset=0
GET {{baseUrl}}/api/users/active
GET {{baseUrl}}/api/users/deleted
GET {{baseUrl}}/api/users/{{userId}}
```

Crear un usuario y su perfil: `POST {{baseUrl}}/api/users`

```json
{
  "name": "Ana Ejemplo",
  "email": "ana@example.com",
  "password": "Una-clave-larga-y-unica-2026!",
  "role": "USER",
  "status": "active",
  "avatarImageUrl": "https://example.com/avatar.png"
}
```

Devuelve 201 con el usuario sin hash. Guarda `data.id` como userId. Puedes usar roleId (ID numérico de un rol USER/ADMIN activo obtenido de `/api/roles`) en lugar de role. No envíes ambos.

Editar: `PATCH {{baseUrl}}/api/users/{{userId}}`

```json
{
  "name": "Ana Actualizada",
  "email": "ana.actualizada@example.com",
  "avatarImageUrl": null
}
```

Puedes incluir password para cambiar la contraseña y role o roleId para cambiar el rol. Para activar/desactivar, utiliza exclusivamente `PATCH {{baseUrl}}/api/users/{{userId}}/active`:

```json
{ "isActive": false }
```

Para eliminar lógicamente: `PATCH {{baseUrl}}/api/users/{{userId}}/softdelete` con `{}`. Comprueba que aparece en `/deleted`, sigue en el listado general y desaparece de `/active`. Su token anterior devuelve 401. Intentar reactivarlo devuelve 409; repetir softdelete devuelve 404.

Desactivar un usuario con organizadores activos devuelve 409. Eliminarlo con cualquier organizador no eliminado también devuelve 409. Un rol desactivado bloquea nuevas asignaciones y reactivaciones de usuarios.

## Eliminar conservando los datos

Usa la cookie de sesión con permisos sobre el recurso, `X-Requested-With: XMLHttpRequest` y Body JSON `{}`:

```http
PATCH {{baseUrl}}/api/events/1/delete
PATCH {{baseUrl}}/api/experiences/1/delete
PATCH {{baseUrl}}/api/categories/1/delete
PATCH {{baseUrl}}/api/hosts/1/delete
PATCH {{baseUrl}}/api/locations/1/delete
PATCH {{baseUrl}}/api/roles/1/delete
PATCH {{baseUrl}}/api/assignments/1/1/delete
```

Devuelve 200 con `data.deletedAt`. La fila y sus imágenes permanecen en PostgreSQL, pero ya no aparecen en los listados ni en los selectores. Repetir el borrado o consultar el registro devuelve 404. Las rutas DELETE ya no están disponibles.

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
