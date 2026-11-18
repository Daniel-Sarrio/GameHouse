// Un proxy por microservicio. No se parsea el cuerpo: se reenvía el stream tal cual, con cabeceras,
// cookies y CORS del propio microservicio, así que para él es transparente.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Socket } from 'node:net';
import type { RequestHandler } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { matchesPrefix, services, type ServiceRoute } from '../config/services';

const UNAVAILABLE = { success: false, message: 'Service unavailable. Try again later.', errors: [] };
const TIMEOUT = { success: false, message: 'The service took too long to respond.', errors: [] };

const isResponse = (res: ServerResponse | Socket): res is ServerResponse => 'setHeader' in res;

const createServiceProxy = (service: ServiceRoute, claimedByOthers: string[]): RequestHandler =>
  createProxyMiddleware<IncomingMessage, ServerResponse>({
    target: service.target,
    changeOrigin: true,
    // Añade X-Forwarded-For/Proto/Host para que el microservicio conozca la IP real del cliente.
    xfwd: true,
    proxyTimeout: service.timeoutMs,
    // Un prefijo más específico de otro servicio (p. ej. /api/agent dentro de /api) no se le envía.
    pathFilter: (path) => matchesPrefix(path, service.prefix) && !claimedByOthers.some((prefix) => matchesPrefix(path, prefix)),
    on: {
      proxyReq: (proxyReq) => {
        if (service.stripCookies) proxyReq.removeHeader('cookie');
      },
      error: (error, req, res) => {
        const code = (error as NodeJS.ErrnoException).code;
        console.error(`[gateway] ${service.name} ${req.method} ${req.url} -> ${code ?? error.message}`);
        if (!isResponse(res)) {
          res.destroy();
          return;
        }
        if (res.headersSent) {
          res.end();
          return;
        }
        const timedOut = code === 'ECONNRESET' || code === 'ETIMEDOUT';
        res.writeHead(timedOut ? 504 : 502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(timedOut ? TIMEOUT : UNAVAILABLE));
      },
    },
  });

/** Proxies en orden de la tabla; cada uno ignora los prefijos de los servicios anteriores. */
export const serviceProxies: RequestHandler[] = services.map((service, index) =>
  createServiceProxy(service, services.slice(0, index).map((previous) => previous.prefix)),
);
