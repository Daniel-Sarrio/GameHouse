import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideEye, LucidePencil, LucidePlus, LucidePower } from '@lucide/angular';
import { Organizador } from '../../../../core/models/host.model';
import { OrganizadoresStore } from '../../../../core/stores/hosts.store';
import { estadoTexto } from '../../../../core/utils/experience.utils';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader/skeleton-loader';

@Component({
  selector: 'app-organizer-list',
  imports: [RouterLink, EmptyState, MensajeError, SkeletonLoader, LucideEye, LucidePencil, LucidePlus, LucidePower],
  templateUrl: './organizer-list.html',
  styleUrl: './organizer-list.css',
})
export class OrganizerList implements OnInit {
  protected readonly store = inject(OrganizadoresStore);
  protected readonly pagina = signal(1);
  protected readonly filasPorPagina = signal<number | 'all'>('all');
  protected readonly totalPaginas = computed(() => this.filasPorPagina() === 'all'
    ? 1 : Math.max(1, Math.ceil(this.store.organizadores().length / Number(this.filasPorPagina()))));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly visibles = computed(() => {
    if (this.filasPorPagina() === 'all') return this.store.organizadores();
    const size = Number(this.filasPorPagina());
    return this.store.organizadores().slice((this.paginaActual() - 1) * size, this.paginaActual() * size);
  });
  protected readonly desde = computed(() => this.store.organizadores().length
    ? this.filasPorPagina() === 'all' ? 1 : (this.paginaActual() - 1) * Number(this.filasPorPagina()) + 1 : 0);
  protected readonly hasta = computed(() => this.filasPorPagina() === 'all'
    ? this.store.organizadores().length : Math.min(this.paginaActual() * Number(this.filasPorPagina()), this.store.organizadores().length));

  ngOnInit(): void { void this.store.cargarOrganizadores(); }
  reintentar(): void { void this.store.cargarOrganizadores(); }
  estado(host: Organizador): string { return estadoTexto(host.status); }
  cambiarFilas(value: string): void {
    this.filasPorPagina.set(value === 'all' ? 'all' : Number(value));
    this.pagina.set(1);
  }
  async cambiarEstado(host: Organizador): Promise<void> {
    if (this.store.guardando()) return;
    await this.store.cambiarEstado(host.id, !host.isActive);
  }
}
