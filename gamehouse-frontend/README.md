# GameHouse Frontend

Dashboard Angular conectado a la API Express + PostgreSQL de GameHouse. Sigue la estructura del frontend de referencia: `auth` / `core` / `features` / `layouts` / `shared`. Usuarios y perfiles usan UUID; los catálogos mantienen IDs numéricos.

## Flujo de uso

1. Inicia sesión en `/login`. La raíz redirige a `/dashboard`.
2. USER y ADMIN acceden a su dashboard y editan sus datos en `/perfil`.
3. ADMIN accede a `/usuarios`, `/experiencias`, `/eventos`, `/categorias`, `/organizadores`, `/lugares` y `/roles`, incluidos detalles y formularios.
4. El menú adapta sus opciones al rol. Un USER que intenta abrir un módulo de administración llega a `/sin-acceso`.
5. Los usuarios se pueden crear, editar, activar/desactivar y eliminar mediante softdelete. Los datos eliminados se conservan.
6. Cerrar sesión o caducar el JWT lleva al login. Los guards conservan la ruta de destino para después del acceso.

## Estructura

```text
src/app/
├── auth/                # store, servicio, interceptor, guards y login
├── core/
│   ├── interceptors/     # petición, carga y errores HTTP
│   ├── models/           # respuesta API y experiencia PostgreSQL
│   ├── services/         # cliente API, experiencias, alertas y estado de carga
│   ├── stores/           # estado con Signals
│   └── utils/
├── features/
│   ├── dashboard/       # inicio adaptado al rol
│   ├── profile/         # perfil propio
│   ├── users/           # formulario y listado de administración
│   └── experiences/
│       ├── components/   # tarjeta, grid y formulario reactivo
│       ├── pages/        # listado, detalle, creación y edición
│       └── experiences.routes.ts
├── layouts/main-layout/
└── shared/
    ├── components/       # navegación, spinner, skeleton, error y vacío
    └── pages/            # página 404
src/environments/          # URL y tiempo de espera de la API
```

Las páginas coordinan UI y routing. Los stores mantienen el estado con Angular Signals. Los servicios consumen la API con timeout e interceptores. Los formularios usan Reactive Forms y errores inline. La interfaz usa Tailwind CSS, iconos Lucide, ngx-skeleton-loader, ngx-spinner y SweetAlert2 para errores globales.

## Autenticación y RBAC

`AuthStore` expone `user`, `token`, `isAuthenticated`, `isAdmin`, `roles`, `login(session)`, `logout()` y `hasRole(role)`. `AuthService` ofrece `login(credentials)`, `logout()`, `restoreSession()` y `validateSession()`; se ocupa de HTTP y sincronizar el store, sin routing ni lógica de UI.

El token se persiste en localStorage bajo `gamehouse.auth.token`. Antes de autorizar una ruta se consulta `/auth/me`, cuya respuesta es directamente `data: user`. Los permisos usan el rol actual de esa respuesta, no un usuario persistido ni el rol antiguo del JWT. El interceptor envía Bearer solo a la API configurada, excluyendo login y registro. Un 401 autenticado cierra la sesión; un 403 la conserva. Las respuestas antiguas no eliminan un token nuevo.

Los tokens caducados, malformados o sin `exp` se rechazan. Un temporizador cierra la sesión al caducar incluso sin peticiones. Las pestañas sincronizan la sesión mediante `storage`. Si falla la validación de sesión se pide volver a entrar. El botón de logout llama a `POST /api/auth/logout` para revocar ese JWT y limpia la sesión local. Si el servidor no responde, se informa de que no se ha podido confirmar la revocación, aunque la sesión local queda cerrada. No hay refresh token. La autorización definitiva sigue en el backend.

La gestión de usuarios pagina de 50 en 50 en el servidor; búsqueda y filtros afectan a la página cargada. Se envía `password`, nunca un hash. `status` es una etiqueta; el acceso depende de `isActive` y `deletedAt`. Los eliminados no admiten edición/restauración. Para editar un inactivo hay que reactivarlo, conforme al backend. Los conflictos con organizadores o roles muestran el mensaje de la API.

## Instalación y ejecución

Inicia primero el backend en `http://localhost:3000`. Después, en `gamehouse-frontend`:

```bash
npm install
npm start
```

Abre `http://localhost:4200`. La URL base de la API se cambia en `src/environments/environment.ts` y `src/environments/environment.development.ts`; permite ese origen en el CORS del backend. Necesitas una cuenta existente: el registro público crea USER y el README del backend explica cómo preparar el primer ADMIN. No se incluyen credenciales de administrador en el frontend.

## Endpoints usados

| Acción | Método y ruta |
| --- | --- |
| Login / sesión | `POST /api/auth/login`, `GET /api/auth/me` |
| Perfil propio | `GET/PATCH /api/profiles/me` |
| Usuarios | `GET/POST /api/users`, `PATCH /api/users/:id` |
| Activación de usuario | `PATCH /api/users/:id/active` con `{ isActive }` |
| Softdelete de usuario | `PATCH /api/users/:id/softdelete` |
| Listar | `GET /api/experiences` |
| Consultar | `GET /api/experiences/slug/:slug` |
| Crear | `POST /api/experiences` |
| Editar | `PATCH /api/experiences/:id` |
| Activar/desactivar | `PATCH /api/experiences/:id/activate` y `/deactivate` |
| Borrado lógico | `PATCH /api/experiences/:id/delete` |

## Verificación

`npm test` ejecuta las pruebas de autenticación con el cliente HTTP e interceptor reales de Angular y un backend HTTP simulado, sin modificar PostgreSQL. Cubren signals, persistencia, restauración, caducidad, roles, guards, errores 401/403, respuestas concurrentes y destinos del token. `npm run build` comprueba TypeScript y todas las plantillas Angular.
