// Arranque del servidor del agente: independiente del backend de GameHouse, sin base de datos y sin estado.
import 'dotenv/config';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import chatRoutes from './routes/chat.routes';
import type { ErrorResponseBody } from './types/chat.types';

const PORT = Number(process.env.PORT) || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL?.trim() || 'http://localhost:4200';

const app = express();
app.disable('x-powered-by');

// CORS solo para el origen del frontend; nunca '*'.
app.use(cors({ origin: FRONTEND_URL, methods: ['POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '10kb' }));

app.use('/api/agent', chatRoutes);

app.use((_req: Request, res: Response<ErrorResponseBody>) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// Errores de express.json (JSON mal formado o cuerpo demasiado grande) sin exponer detalles internos.
app.use((error: { status?: number; type?: string }, _req: Request, res: Response<ErrorResponseBody>, _next: NextFunction) => {
  if (error.type === 'entity.too.large') {
    res.status(413).json({ error: 'La petición es demasiado grande.' });
    return;
  }
  if (error.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
    return;
  }
  console.error('[agent] Error inesperado:', error.type ?? 'desconocido');
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`Agente de GameHouse escuchando en http://localhost:${PORT}`);
  if (!process.env.OPENROUTER_API_KEY || !process.env.OPENROUTER_MODEL) {
    console.warn('[agent] Faltan OPENROUTER_API_KEY u OPENROUTER_MODEL: el chat responderá 502 hasta configurarlos.');
  }
});
