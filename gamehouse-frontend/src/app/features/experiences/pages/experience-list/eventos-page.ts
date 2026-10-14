import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideEye, LucidePencil, LucidePlus, LucidePower, LucideSearch } from '@lucide/angular';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { EventosStore } from '../../../../core/stores/experiences.store';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader/skeleton-loader';
import { Evento } from '../../../../core/models/experience.model';
import { precioTexto } from '../../../../core/utils/experience.utils';

@Component({
  selector: 'app-eventos-page',
  imports: [RouterLink, MensajeError, EmptyState, SkeletonLoader, LucidePlus, LucideEye, LucidePencil, LucidePower, LucideSearch],
  templateUrl: './eventos-page.html',
  styleUrl: './eventos-page.css',
})
export class EventosPage implements OnInit {
  protected readonly store = inject(EventosStore);
  protected readonly busqueda = signal('');
  protected readonly pagina = signal(1);
  protected readonly filasPorPagina = signal(10);
  protected readonly filtrados = computed(() => {
    const termino = this.busqueda().trim().toLocaleLowerCase('es');
    return this.store.eventos().filter((evento) =>
      !termino || `${evento.id} ${evento.name} ${evento.city} ${evento.country}`.toLocaleLowerCase('es').includes(termino)
    );
  });
  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filtrados().length / this.filasPorPagina())));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly visibles = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.filasPorPagina();
    return this.filtrados().slice(inicio, inicio + this.filasPorPagina());
  });
  protected readonly desde = computed(() => this.filtrados().length ? (this.paginaActual() - 1) * this.filasPorPagina() + 1 : 0);
  protected readonly hasta = computed(() => Math.min(this.paginaActual() * this.filasPorPagina(), this.filtrados().length));

  ngOnInit(): void { void this.store.cargarEventos(); }
  reintentar(): void { void this.store.cargarEventos(); }
  precio(evento: Evento): string { return precioTexto(evento.price, evento.currency); }

  buscar(valor: string): void {
    this.busqueda.set(valor);
    this.pagina.set(1);
  }

  cambiarFilas(valor: string): void {
    this.filasPorPagina.set(Number(valor));
    this.pagina.set(1);
  }

  async cambiarEstado(evento: Evento): Promise<void> {
    if (this.store.guardando()) return;
    await this.store.cambiarEstado(evento.id, !evento.isActive);
  }
}
