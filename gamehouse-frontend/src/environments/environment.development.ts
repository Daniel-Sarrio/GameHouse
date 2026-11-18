// Todo el tráfico pasa por el API Gateway (gamehouse-gateway, puerto 4000),
// que reenvía /api/agent al agente y el resto de /api al backend.
export const environment = {
  apiUrl: 'http://localhost:4000/api',
  apiTimeoutMs: 15000,
  agentUrl: 'http://localhost:4000/api/agent',
};
