import { Component, OnInit, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { DatosCategoria } from '../../../../core/models/category.model';
import { CategoriasStore } from '../../../../core/stores/categories.store';
import { CategoryForm } from '../category-form/category-form';

@Component({
  selector: 'app-category-form-page',
  imports: [RouterLink, CategoryForm, EstadoCarga, MensajeError],
  templateUrl: './category-form-page.html',
  styleUrl: './category-form-page.css',
})
export class CategoryFormPage implements OnInit {
  protected readonly store = inject(CategoriasStore);
  private readonly router = inject(Router);
  readonly slug = input<string>();
  protected readonly editando = computed(() => !!this.slug());

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    if (this.slug()) void this.store.cargarCategoria(this.slug()!);
  }
  async onGuardar(datos: DatosCategoria): Promise<void> {
    const category = this.store.categoriaActual();
    const result = this.slug() && category
      ? await this.store.modificarCategoria(category.id, datos)
      : await this.store.crearCategoria(datos);
    if (result) await this.router.navigate(['/categorias', result.slug]);
  }
  onCancelar(): void {
    void this.router.navigate(this.slug() ? ['/categorias', this.slug()] : ['/categorias']);
  }
  reintentar(): void { if (this.slug()) void this.store.cargarCategoria(this.slug()!); }
}
