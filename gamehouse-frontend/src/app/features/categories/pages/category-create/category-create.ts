import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatosCategoria } from '../../../../core/models/category.model';
import { CategoriasStore } from '../../../../core/stores/categories.store';
import { CategoryFormPage } from '../../components/category-form-page/category-form-page';

@Component({
  selector: 'app-category-create',
  imports: [CategoryFormPage],
  template: `
    <app-category-form-page
      [guardando]="store.guardando()"
      [errorServidor]="store.errorAccion()"
      (guardar)="onGuardar($event)"
      (cancelar)="onCancelar()"
    />
  `,
})
export class CategoryCreate implements OnInit {
  protected readonly store = inject(CategoriasStore);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
  }

  async onGuardar(datos: DatosCategoria): Promise<void> {
    if (this.store.guardando()) return;
    try {
      const resultado = await this.store.crearCategoria(datos);
      if (resultado) await this.router.navigate(['/categorias', resultado.slug]);
    } catch (error) {
      this.store.errorAccion.set(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
    }
  }

  onCancelar(): void {
    void this.router.navigate(['/categorias']);
  }
}
