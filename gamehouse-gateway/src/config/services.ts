// Tabla de enrutado del gateway: qué prefijo de URL atiende cada microservicio.
// El orden importa: gana el primer prefijo que coincide, así que los más específicos van antes.

export interface ServiceRoute {
  /** Nombre para logs y para /health. */
  name: string;
  /** Prefijo de la URL pública (se reenvía tal cual, sin recortar). */
  prefix: string;
  /** URL base del microservicio. */
  target: string;
  /** Tiempo máximo de espera de la respuesta del microservicio. */
  timeoutMs: number;
  /** Quita la cabecera Cookie: el servicio no necesita la sesión del usuario. */
  stripCookies: boolean;
}

const url = (value: string | undefined, fallback: string): string => (value?.trim() || fallback).replace(/\/+$/, '');

export const services: ServiceRoute[] = [
  {
    name: 'agent',
    prefix: '/api/agent',
    target: url(process.env.AGENT_URL, 'http://localhost:3001'),
    // El agente corta a los 20 s; dejamos margen para que su propio error llegue al cliente.
    timeoutMs: 25_000,
    stripCookies: true,
  },
  {
    name: 'backend',
    prefix: '/api',
    target: url(process.env.BACKEND_URL, 'http://localhost:3000'),
    timeoutMs: 15_000,
    stripCookies: false,
  },
];

/** true si la ruta es exactamente el prefijo o cuelga de él (/api/agent sí, /api/agentes no). */
export const matchesPrefix = (path: string, prefix: string): boolean =>
  path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`);
