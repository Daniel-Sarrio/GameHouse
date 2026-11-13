// Valida la petición del chat, llama al modelo y responde. Toda entrada del cliente se trata como no fiable.
import type { Request, Response } from 'express';
import { getChatCompletion } from '../services/openrouter.service';
import { buildSystemPrompt } from '../services/prompt.service';
import type {
  ChatMessage,
  ChatRequestBody,
  ChatResponseBody,
  DepartureContext,
  ErrorResponseBody,
  EventContext,
} from '../types/chat.types';

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY = 10;
const MAX_DEPARTURES = 20;
const MAX_TEXT_LENGTH = { name: 180, description: 2000, short: 150 } as const;
const GENERIC_ERROR = 'El asistente no está disponible ahora mismo. Inténtalo de nuevo más tarde.';

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Convierte a texto, quita espacios y recorta a la longitud máxima. */
const toText = (value: unknown, max: number): string => String(value ?? '').trim().slice(0, max);

const toNumber = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

function parseDeparture(raw: unknown): DepartureContext | null {
  if (!isRecord(raw)) return null;
  return {
    startDatetime: toText(raw.startDatetime, 40),
    endDatetime: toText(raw.endDatetime, 40),
    price: toNumber(raw.price),
    capacity: toNumber(raw.capacity),
    availableSpots: toNumber(raw.availableSpots),
    location: toText(raw.location, MAX_TEXT_LENGTH.short),
  };
}

/** Normaliza el evento: solo se conservan los campos conocidos y con longitud limitada. */
function parseEvent(raw: unknown): ParseResult<EventContext> {
  if (!isRecord(raw)) return { ok: false, error: 'Falta el evento.' };
  const name = toText(raw.name, MAX_TEXT_LENGTH.name);
  if (!name) return { ok: false, error: 'El evento necesita un nombre (event.name).' };

  const description = toText(raw.description, MAX_TEXT_LENGTH.description) || null;
  const host = toText(raw.host, MAX_TEXT_LENGTH.short) || null;
  const categories = Array.isArray(raw.categories)
    ? raw.categories.slice(0, 10).map((item) => toText(item, 60)).filter(Boolean)
    : [];
  const departures = Array.isArray(raw.departures)
    ? raw.departures.slice(0, MAX_DEPARTURES).map(parseDeparture).filter((item): item is DepartureContext => item !== null)
    : [];
  return { ok: true, value: { name, description, categories, host, departures } };
}

/** Valida el historial: roles permitidos, contenido como texto recortado y solo los últimos mensajes. */
function parseMessages(raw: unknown): ParseResult<ChatMessage[]> {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: 'messages debe ser un array no vacío.' };

  const messages: ChatMessage[] = [];
  for (const item of raw.slice(-MAX_HISTORY)) {
    if (!isRecord(item) || (item.role !== 'user' && item.role !== 'assistant')) {
      return { ok: false, error: 'Cada mensaje necesita role "user" o "assistant".' };
    }
    const content = toText(item.content, MAX_MESSAGE_LENGTH);
    if (!content) return { ok: false, error: 'Los mensajes no pueden estar vacíos.' };
    messages.push({ role: item.role, content });
  }
  return { ok: true, value: messages };
}

/** Valida el cuerpo completo. Exportada para poder probar la validación de forma aislada. */
export function parseChatRequest(body: unknown): ParseResult<ChatRequestBody> {
  if (!isRecord(body)) return { ok: false, error: 'El cuerpo de la petición no es válido.' };
  const event = parseEvent(body.event);
  if (!event.ok) return event;
  const messages = parseMessages(body.messages);
  if (!messages.ok) return messages;
  return { ok: true, value: { event: event.value, messages: messages.value } };
}

/** POST /api/agent/chat */
export async function chat(req: Request, res: Response<ChatResponseBody | ErrorResponseBody>): Promise<void> {
  const parsed = parseChatRequest(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  try {
    const { event, messages } = parsed.value;
    const reply = await getChatCompletion(buildSystemPrompt(event), messages);
    res.json({ reply });
  } catch (error) {
    // El detalle solo va al log (sin contenido de mensajes ni key); el cliente recibe un error genérico.
    console.error('[agent] Error al consultar el modelo:', error instanceof Error ? error.message : 'desconocido');
    res.status(502).json({ error: GENERIC_ERROR });
  }
}
