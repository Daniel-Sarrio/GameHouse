import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideEye, LucidePencil, LucidePlus } from '@lucide/angular';
import { AsignacionesStore } from '../../../../core/stores/assignments.store';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader/skeleton-loader';

@Component({
  selector: 'app-assignment-list',
  imports: [RouterLink, EmptyState, MensajeError, SkeletonLoader, LucideEye, LucidePencil, LucidePlus],
  templateUrl: './assignment-list.html',
  styleUrl: './assignment-list.css',
})
export class AssignmentList implements OnInit {
  protected readonly store = inject(AsignacionesStore);
  protected readonly pagina = signal(1);
  protected readonly filasPorPagina = signal<number | 'all'>('all');
  protected readonly totalPaginas = computed(() => this.filasPorPagina() === 'all'
    ? 1 : Math.max(1, Math.ceil(this.store.asignaciones().length / Number(this.filasPorPagina()))));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly visibles = computed(() => {
    if (this.filasPorPagina() === 'all') return this.store.asignaciones();
    const size = Number(this.filasPorPagina());
    return this.store.asignaciones().slice((this.paginaActual() - 1) * size, this.paginaActual() * size);
  });
  protected readonly desde = computed(() => this.store.asignaciones().length
    ? this.filasPorPagina() === 'all' ? 1 : (this.paginaActual() - 1) * Number(this.filasPorPagina()) + 1 : 0);
  protected readonly hasta = computed(() => this.filasPorPagina() === 'all'
    ? this.store.asignaciones().length : Math.min(this.paginaActual() * Number(this.filasPorPagina()), this.store.asignaciones().length));

  ngOnInit(): void { void this.store.cargarAsignaciones(); }
  reintentar(): void { void this.store.cargarAsignaciones(); }
  cambiarFilas(value: string): void {
    this.filasPorPagina.set(value === 'all' ? 'all' : Number(value));
    this.pagina.set(1);
  }
}
