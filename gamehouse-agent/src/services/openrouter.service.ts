// Única parte del servidor que habla con OpenRouter (API compatible con OpenAI), con fetch nativo.
import type { ChatMessage } from '../types/chat.types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_REPLY_TOKENS = 400;

/** Error interno de OpenRouter. Su mensaje solo va al log del servidor, nunca al cliente. */
export class OpenRouterError extends Error {}

interface OpenRouterResponse {
  choices?: { message?: { content?: unknown } }[];
}

/** Lee la configuración en cada llamada para no fijar el modelo ni la key en el código. */
function readConfig(): { apiKey: string; model: string } {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim();
  if (!apiKey || !model) throw new OpenRouterError('Faltan OPENROUTER_API_KEY u OPENROUTER_MODEL en el .env');
  return { apiKey, model };
}

/** Envía el system prompt y el historial a OpenRouter y devuelve el texto de la respuesta. */
export async function getChatCompletion(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const { apiKey, model } = readConfig();
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'GameHouse',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: MAX_REPLY_TOKENS,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  // Solo se registra el código de estado: el cuerpo podría repetir datos de la petición.
  if (!response.ok) throw new OpenRouterError(`OpenRouter respondió con estado ${response.status}`);

  const data = (await response.json()) as OpenRouterResponse;
  const reply = data.choices?.[0]?.message?.content;
  if (typeof reply !== 'string' || !reply.trim()) throw new OpenRouterError('OpenRouter devolvió una respuesta vacía');
  return reply.trim();
}
