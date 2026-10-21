import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideEye, LucidePencil, LucidePlus } from '@lucide/angular';
import { LugaresStore } from '../../../../core/stores/locations.store';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader/skeleton-loader';

@Component({
  selector: 'app-location-list',
  imports: [RouterLink, EmptyState, MensajeError, SkeletonLoader, LucideEye, LucidePencil, LucidePlus],
  templateUrl: './location-list.html',
  styleUrl: './location-list.css',
})
export class LocationList implements OnInit {
  protected readonly store = inject(LugaresStore);
  protected readonly pagina = signal(1);
  protected readonly filasPorPagina = signal<number | 'all'>('all');
  protected readonly totalPaginas = computed(() => this.filasPorPagina() === 'all'
    ? 1 : Math.max(1, Math.ceil(this.store.lugares().length / Number(this.filasPorPagina()))));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly visibles = computed(() => {
    if (this.filasPorPagina() === 'all') return this.store.lugares();
    const size = Number(this.filasPorPagina());
    return this.store.lugares().slice((this.paginaActual() - 1) * size, this.paginaActual() * size);
  });
  protected readonly desde = computed(() => this.store.lugares().length
    ? this.filasPorPagina() === 'all' ? 1 : (this.paginaActual() - 1) * Number(this.filasPorPagina()) + 1 : 0);
  protected readonly hasta = computed(() => this.filasPorPagina() === 'all'
    ? this.store.lugares().length : Math.min(this.paginaActual() * Number(this.filasPorPagina()), this.store.lugares().length));

  ngOnInit(): void { void this.store.cargarLugares(); }
  reintentar(): void { void this.store.cargarLugares(); }
  cambiarFilas(value: string): void {
    this.filasPorPagina.set(value === 'all' ? 'all' : Number(value));
    this.pagina.set(1);
  }
}
