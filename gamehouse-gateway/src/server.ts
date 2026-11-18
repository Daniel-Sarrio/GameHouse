// API Gateway de GameHouse: único punto de entrada (puerto 4000) para el frontend y los clientes de la API.
// Reenvía /api/agent/* al agente y el resto de /api/* al backend. Sin base de datos y sin estado.
import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { services } from './config/services';
import { serviceProxies } from './routes/proxy.routes';

const PORT = Number(process.env.PORT) || 4000;
const HEALTH_TIMEOUT_MS = 2_000;

const app = express();
app.disable('x-powered-by');

// Estado del gateway y de cada microservicio (cualquier respuesta HTTP cuenta como "arriba").
app.get('/health', async (_req: Request, res: Response) => {
  const checks = await Promise.all(
    services.map(async ({ name, target }) => {
      try {
        await fetch(target, { method: 'HEAD', signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
        return { name, status: 'up' as const };
      } catch {
        return { name, status: 'down' as const };
      }
    }),
  );
  const allUp = checks.every((check) => check.status === 'up');
  res.status(allUp ? 200 : 503).json({ status: allUp ? 'ok' : 'degraded', services: checks });
});

app.use(serviceProxies);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found', errors: [] });
});

const server = app.listen(PORT, () => {
  console.log(`Gateway de GameHouse escuchando en http://localhost:${PORT}`);
  for (const { name, prefix, target } of services) console.log(`  ${prefix.padEnd(12)} -> ${name} (${target})`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(error.code === 'EADDRINUSE' ? `El puerto ${PORT} ya está ocupado.` : `No se pudo iniciar el gateway: ${error.message}`);
  process.exitCode = 1;
});
