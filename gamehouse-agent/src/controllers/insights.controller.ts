// Analiza las opiniones de una experiencia. Tanto la entrada como la salida del modelo se tratan como no fiables.
import type { Request, Response } from 'express';
import { getChatCompletion } from '../services/openrouter.service';
import { buildInsightsPrompt } from '../services/insights-prompt.service';
import type { ErrorResponseBody } from '../types/chat.types';
import {
  ASPECT_KEYS,
  type AspectKey,
  type AspectRating,
  type InsightsRequestBody,
  type InsightsResponseBody,
  type ReviewComment,
  type Sentiment,
} from '../types/insights.types';

const MAX_COMMENTS = 100;
const MAX_COMMENT_LENGTH = 500;
const MAX_ASPECTS = 6;
const MAX_SUMMARY_LENGTH = 280;
const MAX_POINTS = 5;
const MAX_POINT_LENGTH = 100;
const SENTIMENTS: Sentiment[] = ['positive', 'neutral', 'negative'];
// El análisis se genera en segundo plano y se guarda en caché: puede esperar más que el chat.
const MODEL_TIMEOUT_MS = 90_000;
const GENERIC_ERROR = 'No se pudo analizar las opiniones ahora mismo.';

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const toText = (value: unknown, max: number): string => String(value ?? '').trim().slice(0, max);

/** Valida el cuerpo que envía el backend: experiencia y comentarios recortados. */
export function parseInsightsRequest(body: unknown): ParseResult<InsightsRequestBody> {
  if (!isRecord(body) || !isRecord(body.experience)) return { ok: false, error: 'Falta la experiencia.' };
  const name = toText(body.experience.name, 180);
  if (!name) return { ok: false, error: 'La experiencia necesita un nombre.' };
  const categories = Array.isArray(body.experience.categories)
    ? body.experience.categories.slice(0, 10).map((item) => toText(item, 60)).filter(Boolean)
    : [];
  if (!Array.isArray(body.comments) || body.comments.length === 0) return { ok: false, error: 'comments debe ser un array no vacío.' };

  const comments: ReviewComment[] = [];
  for (const item of body.comments.slice(0, MAX_COMMENTS)) {
    const rating = isRecord(item) ? Number(item.rating) : NaN;
    const text = isRecord(item) ? toText(item.body, MAX_COMMENT_LENGTH) : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !text) {
      return { ok: false, error: 'Cada comentario necesita rating entero de 1 a 5 y texto.' };
    }
    comments.push({ rating, body: text });
  }
  return { ok: true, value: { experience: { name, categories }, comments } };
}

/** Extrae el objeto JSON aunque el modelo lo envuelva en texto o en un bloque de código. */
function extractJson(reply: string): unknown {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('La respuesta del modelo no contiene JSON');
  return JSON.parse(reply.slice(start, end + 1));
}

/** Texto plano: quita marcas de Markdown y espacios repetidos. */
const plainText = (value: unknown, max: number): string =>
  toText(typeof value === 'string' ? value : '', 2000).replace(/[*#_`>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Lista de frases cortas, sin vacías ni repetidas. */
const points = (value: unknown): string[] => [...new Set((Array.isArray(value) ? value : [])
  .map((item) => plainText(item, MAX_POINT_LENGTH)).filter(Boolean))].slice(0, MAX_POINTS);

const roundToHalf = (value: number): number => Math.min(5, Math.max(1, Math.round(value * 2) / 2));

/**
 * Convierte la respuesta del modelo en un resultado seguro: claves de aspecto de la lista cerrada,
 * valoraciones acotadas y el recuento de recomendaciones calculado aquí, nunca copiado del modelo.
 */
export function parseModelInsights(reply: string, comments: ReviewComment[]): InsightsResponseBody {
  const raw = extractJson(reply);
  if (!isRecord(raw)) throw new Error('La respuesta del modelo no es un objeto');

  // Si el modelo no devuelve un booleano por comentario, se usa la valoración (4 o 5 estrellas recomiendan).
  const recommends = Array.isArray(raw.recommends) && raw.recommends.length === comments.length
    && raw.recommends.every((value) => typeof value === 'boolean')
    ? (raw.recommends as boolean[])
    : comments.map((comment) => comment.rating >= 4);

  // Igual con el sentimiento: si no hay uno válido por comentario, se deduce de la valoración.
  const sentiments: Sentiment[] = Array.isArray(raw.sentiments) && raw.sentiments.length === comments.length
    && raw.sentiments.every((value) => SENTIMENTS.includes(value as Sentiment))
    ? (raw.sentiments as Sentiment[])
    : comments.map((comment) => (comment.rating >= 4 ? 'positive' : comment.rating === 3 ? 'neutral' : 'negative'));

  const seen = new Set<AspectKey>();
  const aspects: AspectRating[] = [];
  for (const item of Array.isArray(raw.aspects) ? raw.aspects : []) {
    if (!isRecord(item)) continue;
    const key = item.key as AspectKey;
    const rating = Number(item.rating);
    const mentions = Math.round(Number(item.mentions));
    if (!ASPECT_KEYS.includes(key) || seen.has(key) || !Number.isFinite(rating)) continue;
    seen.add(key);
    aspects.push({ key, rating: roundToHalf(rating), mentions: Math.min(comments.length, Math.max(1, mentions || 1)) });
  }
  aspects.sort((a, b) => b.mentions - a.mentions);

  // Texto plano: se quitan marcas de Markdown que el modelo pudiera añadir.
  const summary = plainText(raw.summary, MAX_SUMMARY_LENGTH);

  return {
    analyzedCount: comments.length,
    recommendCount: recommends.filter(Boolean).length,
    aspects: aspects.slice(0, MAX_ASPECTS),
    summary,
    positives: points(raw.positives),
    negatives: points(raw.negatives),
    sentiment: {
      positive: sentiments.filter((value) => value === 'positive').length,
      neutral: sentiments.filter((value) => value === 'neutral').length,
      negative: sentiments.filter((value) => value === 'negative').length,
    },
  };
}

/** POST /api/agent/insights (solo con el token interno del backend). */
export async function insights(req: Request, res: Response<InsightsResponseBody | ErrorResponseBody>): Promise<void> {
  const parsed = parseInsightsRequest(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  try {
    const reply = await getChatCompletion(
      buildInsightsPrompt(parsed.value),
      [{ role: 'user', content: 'Analiza los comentarios y devuelve solo el objeto JSON.' }],
      // Margen de tokens amplio: los modelos de razonamiento también los consumen al pensar.
      { json: true, maxTokens: 6000, temperature: 0.1, timeoutMs: MODEL_TIMEOUT_MS, reasoningEffort: 'low' },
    );
    res.json(parseModelInsights(reply, parsed.value.comments));
  } catch (error) {
    // Ni comentarios ni key en el log: solo el motivo.
    console.error('[agent] Error al analizar opiniones:', error instanceof Error ? error.message : 'desconocido');
    res.status(502).json({ error: GENERIC_ERROR });
  }
}
