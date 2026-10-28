import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideEye, LucidePencil, LucidePlus, LucideMapPin, LucideCalendarDays, LucidePower } from '@lucide/angular';
import { CelebracionesStore } from '../../../../core/stores/events.store';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader/skeleton-loader';
import { Celebracion } from '../../../../core/models/event.model';
import { precioTexto } from '../../../../core/utils/experience.utils';

@Component({
  selector: 'app-event-list',
  imports: [RouterLink, EmptyState, MensajeError, SkeletonLoader, LucideEye, LucidePencil, LucidePlus, LucideMapPin, LucideCalendarDays, LucidePower],
  templateUrl: './event-list.html',
  styleUrl: './event-list.css',
})
export class EventList implements OnInit {
  protected readonly store = inject(CelebracionesStore);
  protected readonly pagina = signal(1);
  protected readonly filasPorPagina = signal<number | 'all'>('all');
  protected readonly totalPaginas = computed(() => this.filasPorPagina() === 'all'
    ? 1 : Math.max(1, Math.ceil(this.store.celebraciones().length / Number(this.filasPorPagina()))));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly visibles = computed(() => {
    if (this.filasPorPagina() === 'all') return this.store.celebraciones();
    const size = Number(this.filasPorPagina());
    return this.store.celebraciones().slice((this.paginaActual() - 1) * size, this.paginaActual() * size);
  });
  protected readonly desde = computed(() => this.store.celebraciones().length
    ? this.filasPorPagina() === 'all' ? 1 : (this.paginaActual() - 1) * Number(this.filasPorPagina()) + 1 : 0);
  protected readonly hasta = computed(() => this.filasPorPagina() === 'all'
    ? this.store.celebraciones().length : Math.min(this.paginaActual() * Number(this.filasPorPagina()), this.store.celebraciones().length));
  ngOnInit(): void { this.store.limpiarErrorAccion(); void this.store.cargarCelebraciones(); }
  async cambiarEstado(event: Celebracion): Promise<void> {
    if (this.store.guardando()) return;
    await this.store.cambiarEstado(event.id, !event.isActive);
  }
  reintentar(): void { void this.store.cargarCelebraciones(); }
  precio(event: Celebracion): string { return precioTexto(event.price); }
  fecha(value: string | null): string { return value ? new Date(value).toLocaleString('es-ES', { dateStyle:'short', timeStyle:'short' }) : 'Sin programar'; }
  estado(event: Celebracion): string { return { draft:'Borrador', scheduled:'Programado', cancelled:'Cancelado', completed:'Finalizado' }[event.status]; }
  cambiarFilas(value: string): void { this.filasPorPagina.set(value === 'all' ? 'all' : Number(value)); this.pagina.set(1); }
}
