// Tipos compartidos del agente: lo que envía el frontend y lo que responde el servidor.

/** Roles que el cliente puede enviar. El rol "system" solo lo construye el servidor. */
export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** Una fecha programada (departure) de la experiencia, tal como la muestra la tienda. */
export interface DepartureContext {
  startDatetime: string;
  endDatetime: string;
  price: number;
  capacity: number;
  availableSpots: number;
  location: string;
}

/** Datos de la experiencia que recibe el agente. Campos reales del modelo de la tienda. */
export interface EventContext {
  name: string;
  description: string | null;
  categories: string[];
  host: string | null;
  departures: DepartureContext[];
}

export interface ChatRequestBody {
  event: EventContext;
  messages: ChatMessage[];
}

export interface ChatResponseBody {
  reply: string;
}

export interface ErrorResponseBody {
  error: string;
}
