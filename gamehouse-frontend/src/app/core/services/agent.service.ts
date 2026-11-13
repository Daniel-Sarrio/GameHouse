import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AGENT_MAX_HISTORY, AgentEventContext, AgentMessage, AgentReply } from '../models/agent.model';

// Un modelo de lenguaje puede tardar más que la API de GameHouse; el servidor corta a los 20 s.
const AGENT_TIMEOUT_MS = 25_000;

/** Cliente del servidor del AgenteIA (gamehouse-agent). */
@Injectable({ providedIn: 'root' })
export class AgentService {
  // HttpClient creado sobre HttpBackend: no pasa por los interceptores de la app, así que no muestra
  // el spinner global ni las alertas, y no envía las cookies de sesión a otro servidor.
  // Los errores los gestiona el propio componente del chat.
  private readonly http = new HttpClient(inject(HttpBackend));

  /** Envía el historial (últimos mensajes) con el contexto del evento y devuelve la respuesta del agente. */
  async sendMessage(event: AgentEventContext, messages: AgentMessage[]): Promise<string> {
    const body = { event, messages: messages.slice(-AGENT_MAX_HISTORY) };
    const response = await firstValueFrom(
      this.http.post<AgentReply>(`${environment.agentUrl}/chat`, body).pipe(timeout(AGENT_TIMEOUT_MS)),
    );
    return response.reply;
  }
}
