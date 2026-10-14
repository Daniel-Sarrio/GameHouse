# GameHouse Frontend

Dashboard de administración Angular para la tabla `experiences` de GameHouse. Mantiene la arquitectura `core` / `features` / `layouts` / `shared` y consume únicamente la API Express existente.

## Flujo de uso

1. La raíz `/` muestra el resumen administrativo y el catálogo sin filtros.
2. Cada tarjeta abre `/eventos/:slug` con el detalle.
3. La navegación lleva a `/eventos/nuevo` para crear.
4. Desde el detalle se abre `/eventos/:slug/editar` para modificar con el mismo formulario.
5. Desde el listado y el detalle se puede activar o desactivar. El detalle también permite el borrado lógico con confirmación.
6. Después de crear o editar, la aplicación vuelve al detalle; después de eliminar, vuelve al catálogo.

## Estructura

```text
src/app/
├── core/
│   ├── interceptors/     # petición, carga y errores HTTP
│   ├── models/           # respuesta API y experiencia PostgreSQL
│   ├── services/         # cliente API, experiencias, alertas y estado de carga
│   ├── stores/           # estado con Signals
│   └── utils/
├── features/
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

Las páginas coordinan el flujo. Los componentes muestran la interfaz. El store mantiene lista, detalle y errores con Angular Signals. Todas las llamadas HTTP pasan por `ApiService`, con timeout e interceptores. Los formularios usan Reactive Forms y errores inline. La interfaz usa Tailwind CSS, iconos Lucide, ngx-skeleton-loader, ngx-spinner y SweetAlert2 para errores globales.

No se utilizan identificadores de MongoDB: las URLs visibles y las consultas de detalle usan `slug`. La API existente exige el `id` numérico para editar, activar, desactivar y borrar. El backend no ofrece aún endpoints ni tablas para `users`, `hosts`, `categories`, `locations` o `departures`, por lo que no se muestran controles que aparenten gestionarlos. La arquitectura modular permite añadir esas features y autenticación cuando exista su API.

## Instalación y ejecución

Inicia primero el backend en `http://localhost:3000`. Después, en `gamehouse-frontend`:

```bash
npm install
npm start
```

Abre `http://localhost:4200`. La URL base de la API se cambia en `src/environments/environment.ts` y `src/environments/environment.development.ts`.

## Endpoints usados

| Acción | Método y ruta |
| --- | --- |
| Listar | `GET /api/experiences` |
| Consultar | `GET /api/experiences/slug/:slug` |
| Crear | `POST /api/experiences` |
| Editar | `PATCH /api/experiences/:id` |
| Activar/desactivar | `PATCH /api/experiences/:id/activate` y `/deactivate` |
| Borrado lógico | `DELETE /api/experiences/:id` |

El frontend gestiona carga, lista vacía, errores de conexión y errores devueltos por la API. No incluye autenticación, reservas, pagos, favoritos ni funcionalidades que el backend todavía no ofrece.
