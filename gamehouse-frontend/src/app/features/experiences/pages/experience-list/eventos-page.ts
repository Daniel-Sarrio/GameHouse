import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideEye, LucidePencil, LucidePlus, LucidePower } from '@lucide/angular';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { EventosStore } from '../../../../core/stores/experiences.store';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader/skeleton-loader';
import { Evento } from '../../../../core/models/experience.model';
import { EventosService } from '../../../../core/services/experience.service';

@Component({
  selector: 'app-eventos-page',
  imports: [RouterLink, DatePipe, MensajeError, EmptyState, SkeletonLoader, LucidePlus, LucideEye, LucidePencil, LucidePower],
  templateUrl: './eventos-page.html',
  styleUrl: './eventos-page.css',
})
export class EventosPage implements OnInit {
  protected readonly store = inject(EventosStore);
  private readonly service = inject(EventosService);
  protected readonly nombresCategorias = signal<Record<number, string>>({});
  protected readonly pagina = signal(1);
  protected readonly filasPorPagina = signal<number | 'all'>('all');
  protected readonly totalPaginas = computed(() => this.filasPorPagina() === 'all'
    ? 1 : Math.max(1, Math.ceil(this.store.eventos().length / Number(this.filasPorPagina()))));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly visibles = computed(() => {
    if (this.filasPorPagina() === 'all') return this.store.eventos();
    const filas = Number(this.filasPorPagina());
    const inicio = (this.paginaActual() - 1) * filas;
    return this.store.eventos().slice(inicio, inicio + filas);
  });
  protected readonly desde = computed(() => this.store.eventos().length
    ? this.filasPorPagina() === 'all' ? 1 : (this.paginaActual() - 1) * Number(this.filasPorPagina()) + 1
    : 0);
  protected readonly hasta = computed(() => this.filasPorPagina() === 'all'
    ? this.store.eventos().length : Math.min(this.paginaActual() * Number(this.filasPorPagina()), this.store.eventos().length));

  ngOnInit(): void {
    void this.store.cargarEventos();
    void this.service.obtenerOpcionesFormulario().then((opciones) => {
      this.nombresCategorias.set(Object.fromEntries(opciones.categories.map(({ id, name }) => [id, name])));
    }).catch(() => {});
  }
  reintentar(): void { void this.store.cargarEventos(); }
  categorias(evento: Evento): string {
    return evento.categoryNames?.length
      ? evento.categoryNames.join(', ')
      : evento.categoryIds.map((id) => this.nombresCategorias()[id] ?? `#${id}`).join(', ') || '—';
  }

  cambiarFilas(valor: string): void {
    this.filasPorPagina.set(valor === 'all' ? 'all' : Number(valor));
    this.pagina.set(1);
  }

  async cambiarEstado(evento: Evento): Promise<void> {
    if (this.store.guardando()) return;
    await this.store.cambiarEstado(evento.id, !evento.isActive);
  }
}
