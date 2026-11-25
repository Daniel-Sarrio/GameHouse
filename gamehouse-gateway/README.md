# GameHouse Gateway

API Gateway de GameHouse: un servidor Express (puerto **4000**) que es el único punto de entrada para el frontend y los clientes de la API (Postman, etc.). Según la URL, reenvía cada petición al microservicio que la atiende. No tiene base de datos ni estado.

```text
                         ┌─> /api/agent/*  ─> gamehouse-agent   (3001)
frontend (4200) ─> 4000 ─┤
                         └─> /api/*        ─> gamehouse-backend (3000)
```

## Enrutado

La tabla está en `src/config/services.ts`. Gana el primer prefijo que coincide, así que los más específicos van antes:

| Prefijo | Microservicio | Timeout | Cookies |
| --- | --- | --- | --- |
| `/api/agent` | `gamehouse-agent` (`AGENT_URL`) | 100 s (el análisis de opiniones puede esperar al modelo hasta 90 s) | se eliminan (el agente no necesita la sesión) |
| `/api` | `gamehouse-backend` (`BACKEND_URL`) | 15 s | se reenvían |

- La ruta se reenvía completa (`/api/shop/experiences` llega igual al backend).
- El cuerpo no se parsea: se reenvía tal cual, así que validación, límites de tamaño, cookies y CORS siguen siendo los de cada microservicio.
- Se añaden `X-Forwarded-For/Proto/Host`; el backend confía en ellas (`TRUST_PROXY=loopback`) para conocer la IP real del cliente.
- Si un microservicio no responde, el gateway devuelve `502` (caído) o `504` (timeout) con el formato `{ "success": false, "message": "...", "errors": [] }`.
- Para añadir un microservicio nuevo basta con añadir una entrada a `services`.

`GET /health` devuelve el estado de cada microservicio: `200 { "status": "ok", ... }` o `503 { "status": "degraded", ... }`.

## Configuración

```bash
cd gamehouse-gateway
npm install
cp .env.example .env
```

| Variable | Descripción |
| --- | --- |
| `PORT` | Puerto del gateway (por defecto `4000`). |
| `BACKEND_URL` | URL del backend (por defecto `http://localhost:3000`). |
| `AGENT_URL` | URL del agente (por defecto `http://localhost:3001`). |

## Arranque

Arranca el backend y el agente, y después el gateway:

```bash
npm run dev        # desarrollo con recarga (tsx watch)
npm run typecheck  # comprobación de tipos
npm run build && npm start  # compilado a dist/
```

Comprueba que todo responde con `http://localhost:4000/health` y `http://localhost:4000/api/events`.
