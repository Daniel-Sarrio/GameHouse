// Cliente del agente IA (gamehouse-agent). El backend solo ve la gateway (puerto 4000), que reenvía /api/agent.
const AppError = require('./app-error');

// El agente espera al modelo hasta 90 s; la petición se hace siempre en segundo plano.
const TIMEOUT_MS = 100 * 1000;

const config = () => ({
  baseUrl: (process.env.AGENT_API_URL || 'http://localhost:4000/api/agent').replace(/\/+$/, ''),
  token: process.env.AGENT_INTERNAL_TOKEN?.trim() || '',
});

/** Pide al agente el análisis de opiniones. Cualquier fallo se convierte en un 502 genérico. */
const analyzeComments = async ({ experience, comments }) => {
  const { baseUrl, token } = config();
  if (!token) throw new AppError('El análisis de opiniones no está configurado.', 503);
  let response;
  try {
    response = await fetch(`${baseUrl}/insights`, {
      method: 'POST',
      // El token interno identifica al backend ante el agente; nunca llega al navegador.
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': token },
      body: JSON.stringify({ experience, comments }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new AppError('El agente IA no está disponible.', 502);
  }
  if (!response.ok) throw new AppError('El agente IA no pudo analizar las opiniones.', 502);
  return response.json();
};

module.exports = { analyzeComments };
