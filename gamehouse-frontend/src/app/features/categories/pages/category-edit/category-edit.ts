import { Component, OnInit, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { DatosCategoria } from '../../../../core/models/category.model';
import { CategoriasStore } from '../../../../core/stores/categories.store';
import { CategoryFormPage } from '../../components/category-form-page/category-form-page';

@Component({
  selector: 'app-category-edit',
  imports: [CategoryFormPage],
  template: `
    <app-category-form-page
      [editando]="true"
      [categoria]="store.categoriaActual()"
      [cargando]="store.cargandoDetalle()"
      [errorCarga]="store.errorDetalle()"
      (reintentar)="cargarDatos()"
      [guardando]="store.guardando()"
      [errorServidor]="store.errorAccion()"
      (guardar)="onGuardar($event)"
      (cancelar)="onCancelar()"
    />
  `,
})
export class CategoryEdit implements OnInit {
  protected readonly store = inject(CategoriasStore);
  private readonly router = inject(Router);
  readonly slug = input.required<string>();

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    void this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    await this.store.cargarCategoria(this.slug());
  }

  async onGuardar(datos: DatosCategoria): Promise<void> {
    if (this.store.guardando()) return;
    const actual = this.store.categoriaActual();
    if (!actual) return;
    try {
      const resultado = await this.store.modificarCategoria(actual.id, datos);
      if (resultado) await this.router.navigate(['/categorias', resultado.slug]);
    } catch (error) {
      this.store.errorAccion.set(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
    }
  }

  onCancelar(): void {
    void this.router.navigate(['/categorias', this.slug()]);
  }
}
