import { Component, input, linkedSignal } from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { Subject, debounce, filter, map, timer } from 'rxjs';
import { LucideSearch, LucideX } from '@lucide/angular';

const DEBOUNCE_MS = 350;

/**
 * Búsqueda con debounce: emite cuando el usuario deja de escribir (o al pulsar Enter / limpiar).
 * `value` llega desde la URL, de modo que el campo se sincroniza con atrás/adelante del navegador.
 */
@Component({
  selector: 'app-search-box',
  imports: [LucideSearch, LucideX],
  template: `
    <form role="search" class="relative" (submit)="$event.preventDefault(); submitNow()">
      <label class="sr-only" [for]="inputId()">{{ label() }}</label>
      <svg lucideSearch [size]="18" aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"></svg>
      <input
        [id]="inputId()"
        type="search"
        autocomplete="off"
        maxlength="100"
        class="w-full rounded-xl border border-slate-200 bg-superficie py-3 pr-10 pl-10 text-sm shadow-sm outline-none focus:border-indigo-400"
        [placeholder]="placeholder()"
        [value]="term()"
        (input)="onInput($any($event.target).value)"
      />
      @if (term()) {
        <button type="button" class="absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          (click)="clear()" aria-label="Limpiar búsqueda">
          <svg lucideX [size]="16" aria-hidden="true"></svg>
        </button>
      }
    </form>
  `,
})
export class SearchBox {
  readonly value = input('');
  readonly label = input('Buscar');
  readonly placeholder = input('Buscar…');
  readonly inputId = input('search-box');

  /** Texto mostrado: se reinicia cuando cambia el valor externo (URL). */
  readonly term = linkedSignal(() => this.value());

  // Cada cambio reinicia la espera; Enter o limpiar emiten al momento y anulan la pendiente.
  private readonly changes$ = new Subject<{ term: string; immediate: boolean }>();

  readonly search = outputFromObservable(
    this.changes$.pipe(
      debounce(({ immediate }) => timer(immediate ? 0 : DEBOUNCE_MS)),
      map(({ term }) => term.trim()),
      // Solo emite si difiere de lo que ya refleja la URL: evita navegaciones duplicadas.
      filter((term) => term !== this.value().trim()),
    ),
  );

  onInput(value: string): void {
    this.term.set(value);
    this.changes$.next({ term: value, immediate: false });
  }

  submitNow(): void {
    this.changes$.next({ term: this.term(), immediate: true });
  }

  clear(): void {
    this.term.set('');
    this.changes$.next({ term: '', immediate: true });
  }
}
