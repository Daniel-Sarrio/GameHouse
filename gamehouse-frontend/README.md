# GameHouse Frontend

Dashboard Angular conectado a la API Express + PostgreSQL de GameHouse. Sigue la estructura del frontend de referencia: `auth` / `core` / `features` / `layouts` / `shared`. Usuarios y perfiles usan UUID; los catálogos mantienen IDs numéricos.

## Flujo de uso

1. La raíz `/` es el home público y `/tienda` el shop; no requieren sesión. Inicia sesión en `/login` para acceder a `/dashboard`.
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
│   ├── shop/            # home, listado y detalle públicos (components + pages)
│   ├── users/           # formulario y listado de administración
│   └── experiences/
│       ├── components/   # tarjeta, grid y formulario reactivo
│       ├── pages/        # listado, detalle, creación y edición
│       └── experiences.routes.ts
├── layouts/main-layout/  # panel privado
├── layouts/shop-layout/  # home y shop públicos
└── shared/
    ├── components/       # navegación, spinner, skeleton, error, vacío, carrusel, filtros, búsqueda y paginación
    └── pages/            # página 404
src/environments/          # URL y tiempo de espera de la API
```

Las páginas coordinan UI y routing. Los stores mantienen el estado con Angular Signals. Los servicios consumen la API con timeout e interceptores. Los formularios usan Reactive Forms y errores inline. La interfaz usa Tailwind CSS, iconos Lucide, ngx-skeleton-loader, ngx-spinner y SweetAlert2 para errores globales.

## Autenticación y RBAC

`AuthStore` expone `user`, `isAuthenticated`, `isAdmin`, `roles`, `login(session)`, `logout()` y `hasRole(role)`. `AuthService` ofrece `login(credentials)`, `logout()`, `restoreSession()` y `validateSession()`; se ocupa de HTTP y sincronizar el store, sin routing ni lógica de UI.

El servidor guarda el JWT en una cookie HttpOnly: JavaScript no puede leerlo. El interceptor de auth utiliza `withCredentials: true` solo para la API configurada, también al iniciar sesión. Se conserva el interceptor de peticiones existente, que añade `X-Requested-With: XMLHttpRequest`. No se guarda el token en localStorage; al arrancar se elimina únicamente la clave heredada de versiones anteriores.

Al arrancar o pulsar F5, el inicializador espera a `GET /auth/me` antes de mostrar rutas privadas. La respuesta mantiene `data: user` e incluye `expiresAt` en milisegundos. Los guards ya existentes siguen validando la sesión en el servidor. El backend comprueba la firma, expiración, blacklist, usuario activo y coincidencia del rol del JWT con el rol vigente. Cambiar de rol exige iniciar sesión de nuevo.

Un temporizador cierra el estado local al caducar. Las pestañas notifican cambios mediante BroadcastChannel y revalidan al recuperar el foco. Un 401 cierra la sesión; un 403 la conserva. Logout revoca el JWT en la blacklist existente y elimina la cookie. Si falla la red se informa de que la revocación no pudo confirmarse. No hay refresh token.

El formulario de login está separado de la página en `shared/components/login-form`. El componente reutilizable `shared/components/avatar` muestra la imagen o iniciales si falta/falla. Navbar, cabecera y perfil leen el mismo AuthStore; guardar el perfil actualiza el avatar mediante la revalidación existente, sin F5.

La gestión de usuarios pagina de 50 en 50 en el servidor; búsqueda y filtros afectan a la página cargada. Se envía `password`, nunca un hash. `status` es una etiqueta; el acceso depende de `isActive` y `deletedAt`. Los eliminados no admiten edición/restauración. Para editar un inactivo hay que reactivarlo, conforme al backend. Los conflictos con organizadores o roles muestran el mensaje de la API.

## Home y shop

- **Home (`/`)**: tres carruseles (categorías, organizadores y lugares) con `FacetCarousel` + `FacetCard`. Cada tarjeta enlaza a `/tienda?category=ID`, `?host=ID` o `?location=ID` (deep-linking).
- **Shop (`/tienda`)**: `ExperienceList` + `ExperienceCard`, filtros (`ShopFiltersPanel` compone tres `FilterGroup`), búsqueda por nombre, orden y paginación. En móvil los filtros se pliegan.
- **Detalle (`/tienda/:slug`)**: carrusel de imágenes, categorías, organizador, lugares y selector de departures (fecha de inicio y fin, lugar, plazas y precio). La departure elegida se guarda en `?fecha=ID`.

La URL es la única fuente de verdad: `ShopPage` escucha `queryParamMap`, lo valida con `parseShopFilters` y llama a `ShopStore.loadExperiences`. Filtrar, buscar u ordenar navega con nuevos query params y vuelve a la página 1, así que recargar, compartir el enlace y atrás/adelante mantienen el estado. Los cambios de filtros usan `scroll: 'manual'` para no saltar arriba y la búsqueda usa `replaceUrl` para no llenar el historial.

`ShopStore` (Signals) guarda facetas, filtros, resultados, paginación, carga y errores. Cada búsqueda aborta la anterior con `AbortController` (`ApiService.get` acepta `signal` y cancela la petición HTTP), y `SearchBox` aplica un debounce de 350 ms; Enter y limpiar emiten al momento. `ShopExperienceStore` gestiona el detalle y la departure seleccionada.

Componentes reutilizables en `shared/components`: `Carousel` (scroll-snap, flechas e indicadores), `SearchBox`, `FilterGroup`, `Pagination` y `CoverImage` (degradado si la imagen falta o falla).

**Reservas (fase posterior)**: `BookingPanel` ya muestra departure, plazas y total, con el botón deshabilitado. `ShopExperienceStore.bookingDraft` expone `{ experienceSlug, departureId, spots }` y el backend devuelve `availableSpots`: bastará con añadir el servicio de reservas, activar `bookingEnabled` y restar plazas ocupadas en el repositorio.

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
| Home y shop | `GET /api/shop/categories`, `/hosts`, `/locations`, `/experiences?category=&host=&location=&search=&sort=&page=&limit=`, `/experiences/:slug`, `/experiences/:slug/departures` |
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

`npm test` ejecuta las pruebas de autenticación con el cliente HTTP e interceptor reales de Angular y un backend HTTP simulado, sin modificar PostgreSQL. Cubren signals, persistencia, restauración, caducidad, roles, guards, errores 401/403, respuestas concurrentes y aislamiento de credenciales y actualización reactiva del avatar. `npm run build` comprueba TypeScript y todas las plantillas Angular.
