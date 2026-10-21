import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { CategoriasStore } from '../../../../core/stores/categories.store';
import { estadoTexto } from '../../../../core/utils/experience.utils';

@Component({
  selector: 'app-category-detail',
  imports: [RouterLink, EstadoCarga, MensajeError],
  templateUrl: './category-detail.html',
  styleUrl: './category-detail.css',
})
export class CategoryDetail implements OnInit {
  protected store = inject(CategoriasStore);
  private readonly router = inject(Router);
  slug = input.required<string>();
  protected confirmandoBorrado = signal(false);
  protected vista = computed(() => {
    const categoria = this.store.categoriaActual();
    return categoria ? { categoria, estado: estadoTexto(categoria.status) } : null;
  });

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    void this.store.cargarCategoria(this.slug());
  }
  async cambiarEstado(): Promise<void> {
    const categoria = this.store.categoriaActual();
    if (categoria) await this.store.cambiarEstado(categoria.id, !categoria.isActive);
  }
  async eliminar(): Promise<void> {
    const categoria = this.store.categoriaActual();
    if (!categoria) return;
    const borrado = await this.store.eliminarCategoria(categoria.id);
    if (borrado) await this.router.navigate(['/categorias']);
    else this.confirmandoBorrado.set(false);
  }
  reintentar(): void { void this.store.cargarCategoria(this.slug()); }
}
