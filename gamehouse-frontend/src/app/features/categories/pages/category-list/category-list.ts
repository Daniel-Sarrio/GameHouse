import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideEye, LucidePencil, LucidePlus, LucidePower } from '@lucide/angular';
import { Categoria } from '../../../../core/models/category.model';
import { CategoriasStore } from '../../../../core/stores/categories.store';
import { estadoTexto } from '../../../../core/utils/experience.utils';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader/skeleton-loader';

@Component({
  selector: 'app-category-list',
  imports: [RouterLink, EmptyState, MensajeError, SkeletonLoader, LucideEye, LucidePencil, LucidePlus, LucidePower],
  templateUrl: './category-list.html',
  styleUrl: './category-list.css',
})
export class CategoryList implements OnInit {
  protected readonly store = inject(CategoriasStore);
  protected readonly pagina = signal(1);
  protected readonly filasPorPagina = signal<number | 'all'>('all');
  protected readonly totalPaginas = computed(() => this.filasPorPagina() === 'all'
    ? 1 : Math.max(1, Math.ceil(this.store.categorias().length / Number(this.filasPorPagina()))));
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly visibles = computed(() => {
    if (this.filasPorPagina() === 'all') return this.store.categorias();
    const size = Number(this.filasPorPagina());
    return this.store.categorias().slice((this.paginaActual() - 1) * size, this.paginaActual() * size);
  });
  protected readonly desde = computed(() => this.store.categorias().length
    ? this.filasPorPagina() === 'all' ? 1 : (this.paginaActual() - 1) * Number(this.filasPorPagina()) + 1 : 0);
  protected readonly hasta = computed(() => this.filasPorPagina() === 'all'
    ? this.store.categorias().length : Math.min(this.paginaActual() * Number(this.filasPorPagina()), this.store.categorias().length));

  ngOnInit(): void { void this.store.cargarCategorias(); }
  reintentar(): void { void this.store.cargarCategorias(); }
  estado(categoria: Categoria): string { return estadoTexto(categoria.status); }
  cambiarFilas(value: string): void {
    this.filasPorPagina.set(value === 'all' ? 'all' : Number(value));
    this.pagina.set(1);
  }
  async cambiarEstado(categoria: Categoria): Promise<void> {
    if (this.store.guardando()) return;
    await this.store.cambiarEstado(categoria.id, !categoria.isActive);
  }
}
