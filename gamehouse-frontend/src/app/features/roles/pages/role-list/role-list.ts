import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideEye, LucidePencil, LucidePlus } from '@lucide/angular';
import { RolesStore } from '../../../../core/stores/roles.store';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader/skeleton-loader';

@Component({
  selector: 'app-role-list',
  imports: [RouterLink, EmptyState, MensajeError, SkeletonLoader, LucideEye, LucidePencil, LucidePlus],
  templateUrl: './role-list.html',
  styleUrl: './role-list.css',
})
export class RoleList implements OnInit {
  protected readonly store = inject(RolesStore);
  protected readonly pagina = signal(1);
  protected readonly filasPorPagina = signal<number | 'all'>('all');
  protected readonly totalPaginas = computed(() => this.filasPorPagina() === 'all'
    ? 1 : Math.max(1, Math.ceil(this.store.roles().length / Number(this.filasPorPagina()))));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly visibles = computed(() => {
    if (this.filasPorPagina() === 'all') return this.store.roles();
    const size = Number(this.filasPorPagina());
    return this.store.roles().slice((this.paginaActual() - 1) * size, this.paginaActual() * size);
  });
  protected readonly desde = computed(() => this.store.roles().length
    ? this.filasPorPagina() === 'all' ? 1 : (this.paginaActual() - 1) * Number(this.filasPorPagina()) + 1 : 0);
  protected readonly hasta = computed(() => this.filasPorPagina() === 'all'
    ? this.store.roles().length : Math.min(this.paginaActual() * Number(this.filasPorPagina()), this.store.roles().length));

  ngOnInit(): void { void this.store.cargarRoles(); }
  reintentar(): void { void this.store.cargarRoles(); }
  cambiarFilas(value: string): void {
    this.filasPorPagina.set(value === 'all' ? 'all' : Number(value));
    this.pagina.set(1);
  }
}
