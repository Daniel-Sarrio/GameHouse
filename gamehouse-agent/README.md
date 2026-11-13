# GameHouse Agent

Servidor Express independiente (puerto 3001) que da vida al AgenteIA del detalle de experiencias de la tienda (`/tienda/:slug`). Responde dudas sobre **una** experiencia usando OpenRouter. No tiene base de datos, no se conecta al backend de GameHouse y no guarda historial: el frontend envía el contexto del evento y los últimos mensajes en cada petición.

## Configuración

```bash
cd gamehouse-agent
npm install
cp .env.example .env
```

Rellena `.env` (nunca lo subas al repositorio; está en `.gitignore`):

| Variable | Descripción |
| --- | --- |
| `PORT` | Puerto del servidor (por defecto `3001`). |
| `OPENROUTER_API_KEY` | Tu key de [OpenRouter](https://openrouter.ai/keys). Solo vive en este `.env`. |
| `OPENROUTER_MODEL` | Modelo de OpenRouter, por ejemplo `openai/gpt-4o-mini`. |
| `FRONTEND_URL` | Único origen permitido por CORS (por defecto `http://localhost:4200`). |

Sin key o sin modelo el servidor arranca, pero el chat responde `502`.

## Arranque

```bash
npm run dev        # desarrollo con recarga (tsx watch)
npm run typecheck  # comprobación de tipos
npm run build && npm start  # compilado a dist/
```

## Endpoint

`POST /api/agent/chat`

```json
{
  "event": {
    "name": "Torneo de FC27",
    "description": "Torneo por eliminatorias...",
    "categories": ["Torneos", "Gaming"],
    "host": "GameHouse",
    "departures": [
      {
        "startDatetime": "2026-11-20T17:00:00.000Z",
        "endDatetime": "2026-11-20T20:00:00.000Z",
        "price": 15,
        "capacity": 32,
        "availableSpots": 32,
        "location": "GameHouse Arena, Valencia"
      }
    ]
  },
  "messages": [{ "role": "user", "content": "¿Cuánto cuesta?" }]
}
```

Respuesta: `{ "reply": "..." }`

| Código | Cuándo |
| --- | --- |
| `200` | Respuesta del agente. |
| `400` | Falta `event.name`, `messages` vacío, `role` distinto de `user`/`assistant`, mensaje vacío o JSON no válido. |
| `413` | Cuerpo mayor de 10 kB. |
| `502` | OpenRouter no responde, falla o no está configurado (mensaje genérico; el detalle solo va al log). |

## Seguridad

- El system prompt se construye siempre en el servidor (`src/services/prompt.service.ts`); los datos del evento se insertan como datos y el agente debe ignorar instrucciones que contradigan sus reglas.
- Cada mensaje se convierte a texto y se recorta a 500 caracteres; solo se usan los 10 últimos mensajes.
- CORS solo admite `FRONTEND_URL` y el cuerpo está limitado a 10 kB.
- No se registran en consola ni la key ni el contenido de los mensajes.
