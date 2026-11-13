// Modelos del AgenteIA. Deben coincidir con gamehouse-agent/src/types/chat.types.ts.

export type AgentRole = 'user' | 'assistant';

export interface AgentMessage {
  role: AgentRole;
  content: string;
}

export interface AgentDeparture {
  startDatetime: string;
  endDatetime: string;
  price: number;
  capacity: number;
  availableSpots: number;
  location: string;
}

/** Datos de la experiencia que se envían al agente como contexto. */
export interface AgentEventContext {
  name: string;
  description: string | null;
  categories: string[];
  host: string | null;
  departures: AgentDeparture[];
}

export interface AgentReply {
  reply: string;
}

/** Límites que también aplica el servidor; el cliente los respeta para no enviar datos que se descartarían. */
export const AGENT_MAX_MESSAGE_LENGTH = 500;
export const AGENT_MAX_HISTORY = 10;
