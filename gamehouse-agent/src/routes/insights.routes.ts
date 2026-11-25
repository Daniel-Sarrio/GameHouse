// Análisis de opiniones, montado en /api/agent/insights. Uso interno: solo lo llama el backend de GameHouse.
import { timingSafeEqual } from 'node:crypto';
import express, { Router, type NextFunction, type Request, type Response } from 'express';
import { insights } from '../controllers/insights.controller';
import type { ErrorResponseBody } from '../types/chat.types';

const router = Router();

/** Compara el token interno en tiempo constante. Sin AGENT_INTERNAL_TOKEN configurado, la ruta queda cerrada. */
function requireInternalToken(req: Request, res: Response<ErrorResponseBody>, next: NextFunction): void {
  const expected = process.env.AGENT_INTERNAL_TOKEN?.trim();
  if (!expected || Buffer.byteLength(expected) < 32) {
    res.status(503).json({ error: 'El análisis de opiniones no está configurado.' });
    return;
  }
  const received = Buffer.from(req.get('X-Internal-Token') ?? '');
  const valid = Buffer.from(expected);
  if (received.length !== valid.length || !timingSafeEqual(received, valid)) {
    res.status(401).json({ error: 'No autorizado.' });
    return;
  }
  next();
}

// El token se comprueba antes de leer el cuerpo; hasta 100 comentarios de 500 caracteres caben en 80 kB.
router.post('/', requireInternalToken, express.json({ limit: '80kb' }), insights);

export default router;
