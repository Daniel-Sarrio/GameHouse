import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { Categoria, DatosCategoria } from '../../../../core/models/category.model';
import { CategoryForm } from '../category-form/category-form';

@Component({
  selector: 'app-category-form-page',
  imports: [RouterLink, CategoryForm, EstadoCarga, MensajeError],
  templateUrl: './category-form-page.html',
  styleUrl: './category-form-page.css',
})
export class CategoryFormPage {
  // Solo presentación: los datos y las acciones los controla la page.
  readonly editando = input(false);
  readonly categoria = input<Categoria | null>(null);
  readonly cargando = input(false);
  readonly errorCarga = input<string | null>(null);
  readonly guardando = input(false);
  readonly errorServidor = input<string | null>(null);
  readonly guardar = output<DatosCategoria>();
  readonly cancelar = output<void>();
  readonly reintentar = output<void>();
}
