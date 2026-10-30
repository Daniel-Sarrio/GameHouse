# Ejemplos de API para Postman

La experiencia es genérica y puede reutilizarse en varios eventos.

## Autenticación

Usa una variable `baseUrl` con valor `http://localhost:3000`. Para peticiones JSON selecciona Body → raw → JSON. Las operaciones administrativas de los ejemplos posteriores requieren un token ADMIN.

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

Devuelve 201 con `data.user`, `data.profile` y `data.token`. En Scripts → Post-response puedes guardar las variables:

```javascript
if (pm.response.code === 201) {
  const { user, profile, token } = pm.response.json().data;
  pm.environment.set('token', token);
  pm.environment.set('userId', user.id);
  pm.environment.set('profileId', profile.id);
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

Devuelve 200 con `data.token` y `data.user`; credenciales incorrectas devuelven 401. Guarda `data.token` en la variable `token`. Para las siguientes peticiones usa Authorization → Bearer Token → `{{token}}`.

### Cerrar sesión

Envía `POST {{baseUrl}}/api/auth/logout` con Authorization → Bearer Token → `{{token}}`. No necesita cuerpo. Devuelve 200 con `success: true` y `data.message`. El token presentado queda revocado; reutilizarlo en una ruta protegida devuelve 401, incluso tras reiniciar el backend. Otras sesiones siguen siendo válidas.

Después de una respuesta correcta, elimina el token de Postman:

```js
if (pm.response.code === 200) pm.environment.unset('token');
```

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

## Gestión completa de usuarios (ADMIN)

La ruta base es `{{baseUrl}}/api/users` y todos estos ejemplos usan Bearer `{{token}}` de un ADMIN.

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

Usa Bearer Token con permisos sobre el recurso y Body JSON `{}`:

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
