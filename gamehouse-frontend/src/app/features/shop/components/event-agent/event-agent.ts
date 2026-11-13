import { Component, ElementRef, afterRenderEffect, computed, inject, input, linkedSignal, signal, viewChild } from '@angular/core';
import { LucideBot, LucideSend } from '@lucide/angular';
import {
  AGENT_MAX_MESSAGE_LENGTH,
  AgentDeparture,
  AgentEventContext,
  AgentMessage,
} from '../../../../core/models/agent.model';
import { Departure, ShopExperienceDetail } from '../../../../core/models/shop.model';
import { AgentService } from '../../../../core/services/agent.service';

const FRIENDLY_ERROR = 'No he podido responder ahora mismo. Inténtalo de nuevo en unos segundos.';

/** Convierte una departure de la tienda al formato que espera el agente. */
const toAgentDeparture = (departure: Departure): AgentDeparture => ({
  startDatetime: departure.startDatetime,
  endDatetime: departure.endDatetime,
  price: departure.price,
  capacity: departure.capacity,
  availableSpots: departure.availableSpots,
  location: `${departure.location.name}, ${departure.location.city}`,
});

/**
 * Chat del AgenteIA para resolver dudas de una experiencia concreta. Solo se usa en el detalle de la
 * tienda. El historial vive en memoria y se reinicia al cambiar de experiencia.
 */
@Component({
  selector: 'app-event-agent',
  imports: [LucideBot, LucideSend],
  template: `
    <section class="agente" aria-labelledby="agente-titulo">
      <header class="flex items-center gap-2">
        <svg lucideBot [size]="20" aria-hidden="true" class="text-acento-texto"></svg>
        <h2 id="agente-titulo" class="m-0 text-base font-bold">¿Tienes dudas sobre esta experiencia?</h2>
      </header>
      <p class="mt-1 mb-0 text-sm text-slate-500">Pregunta al asistente de GameHouse por fechas, precios, plazas o el lugar.</p>

      <!-- Mensajes en texto plano (interpolación): nunca se interpreta HTML de la IA ni del usuario. -->
      <ul #lista class="mensajes" aria-live="polite">
        @for (message of messages(); track $index) {
          <li class="mensaje" [class.usuario]="message.role === 'user'">
            <span class="sr-only">{{ message.role === 'user' ? 'Tú:' : 'Asistente:' }}</span>{{ message.content }}
          </li>
        } @empty {
          <li class="vacio">Por ejemplo: «¿Qué fechas quedan libres?»</li>
        }
        @if (loading()) {
          <li class="mensaje escribiendo">Escribiendo…</li>
        }
      </ul>

      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      <form class="flex gap-2" (submit)="$event.preventDefault(); send()">
        <label class="sr-only" for="agente-pregunta">Tu pregunta</label>
        <input id="agente-pregunta" type="text" autocomplete="off" [maxLength]="maxLength"
          class="campo" placeholder="Escribe tu pregunta…" [value]="draft()"
          (input)="draft.set($any($event.target).value)" [disabled]="loading()" />
        <button type="submit" class="boton boton-primario" [disabled]="!canSend()" aria-label="Enviar pregunta">
          <svg lucideSend [size]="16" aria-hidden="true"></svg>
        </button>
      </form>
    </section>
  `,
  styles: [`
    .agente { display: flex; flex-direction: column; gap: .75rem; padding: 1.25rem; border: 1px solid var(--borde); border-radius: 16px; background: var(--superficie); }
    .mensajes { display: flex; flex-direction: column; gap: .5rem; max-height: 18rem; margin: 0; padding: 0; overflow-y: auto; list-style: none; }
    .mensaje { align-self: flex-start; max-width: 85%; padding: .6rem .8rem; border-radius: 12px 12px 12px 4px; background: var(--superficie-hundida); color: var(--tinta); font-size: .9rem; line-height: 1.45; white-space: pre-line; overflow-wrap: anywhere; }
    .mensaje.usuario { align-self: flex-end; border-radius: 12px 12px 4px 12px; background: var(--acento-suave); color: var(--acento-fuerte); }
    .escribiendo { color: var(--suave); font-style: italic; }
    .vacio { color: var(--texto-tenue); font-size: .85rem; }
    .error { margin: 0; padding: .55rem .75rem; border: 1px solid var(--peligro-borde); border-radius: 10px; background: var(--peligro-suave); color: var(--peligro-texto); font-size: .85rem; }
    .campo { flex: 1; min-width: 0; padding: .7rem .85rem; border: 1px solid var(--borde); border-radius: 10px; background: var(--superficie); color: var(--tinta); }
    .campo:focus { border-color: var(--acento-borde); outline: none; }
  `],
})
export class EventAgent {
  readonly experience = input.required<ShopExperienceDetail>();
  readonly departures = input<Departure[]>([]);

  private readonly agent = inject(AgentService);
  private readonly list = viewChild<ElementRef<HTMLUListElement>>('lista');

  readonly maxLength = AGENT_MAX_MESSAGE_LENGTH;
  // Historial solo en memoria; se vacía si el componente pasa a mostrar otra experiencia.
  readonly messages = linkedSignal<string, AgentMessage[]>({ source: () => this.experience().slug, computation: () => [] });
  readonly draft = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly canSend = computed(() => !this.loading() && this.draft().trim().length > 0);

  private readonly context = computed<AgentEventContext>(() => {
    const experience = this.experience();
    return {
      name: experience.name,
      description: experience.description,
      categories: experience.categories.map((category) => category.name),
      host: experience.host.name,
      departures: this.departures().map(toAgentDeparture),
    };
  });

  constructor() {
    // Mantiene visible el último mensaje.
    afterRenderEffect(() => {
      this.messages();
      this.loading();
      const element = this.list()?.nativeElement;
      if (element) element.scrollTop = element.scrollHeight;
    });
  }

  async send(): Promise<void> {
    const content = this.draft().trim().slice(0, AGENT_MAX_MESSAGE_LENGTH);
    if (!content || this.loading()) return;

    const slug = this.experience().slug;
    const history: AgentMessage[] = [...this.messages(), { role: 'user', content }];
    this.messages.set(history);
    this.draft.set('');
    this.error.set(null);
    this.loading.set(true);
    try {
      const reply = await this.agent.sendMessage(this.context(), history);
      // Si mientras tanto se ha cambiado de experiencia, la respuesta ya no corresponde.
      if (this.experience().slug === slug) this.messages.update((list) => [...list, { role: 'assistant', content: reply }]);
    } catch {
      if (this.experience().slug === slug) this.error.set(FRIENDLY_ERROR);
    } finally {
      this.loading.set(false);
    }
  }
}
