import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatosCelebracion, OpcionesCelebracion } from '../../../../core/models/event.model';
import { CelebracionesStore } from '../../../../core/stores/events.store';
import { CelebracionesService } from '../../../../core/services/event.service';
import { EventFormPage } from '../../components/event-form-page/event-form-page';

@Component({
  selector: 'app-event-create',
  imports: [EventFormPage],
  template: `
    <app-event-form-page
      [guardando]="store.guardando()"
      [errorServidor]="store.errorAccion()"
      [opciones]="opciones()"
      [cargandoOpciones]="cargandoOpciones()"
      [errorOpciones]="errorOpciones()"
      (reintentarOpciones)="cargarOpciones()"
      (guardar)="onGuardar($event)"
      (cancelar)="onCancelar()"
    />
  `,
})
export class EventCreate implements OnInit {
  protected readonly store = inject(CelebracionesStore);
  private readonly router = inject(Router);
  private readonly service = inject(CelebracionesService);
  readonly opciones = signal<OpcionesCelebracion>({ experiences: [], locations: [], categories: [] });
  readonly cargandoOpciones = signal(false);
  readonly errorOpciones = signal<string | null>(null);

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    void this.cargarOpciones();
  }

  async cargarOpciones(): Promise<void> {
    this.cargandoOpciones.set(true);
    this.errorOpciones.set(null);
    try {
      this.opciones.set(await this.service.obtenerOpcionesFormulario());
    } catch (error) {
      this.errorOpciones.set(error instanceof Error ? error.message : 'No se pudieron cargar las opciones.');
    } finally {
      this.cargandoOpciones.set(false);
    }
  }

  async onGuardar(datos: DatosCelebracion): Promise<void> {
    if (this.store.guardando() || this.cargandoOpciones() || this.errorOpciones()) return;
    try {
      // La categoría debe pertenecer a la experiencia seleccionada.
      if (!this.opciones().categories.some((categoria) =>
        categoria.experienceId === datos.experienceId && categoria.id === datos.categoryId)) {
        this.store.errorAccion.set('La categoría no pertenece a esta experiencia.');
        return;
      }
      // Un evento programado necesita ambas fechas y el fin debe ser posterior al inicio.
      if (!!datos.startDatetime !== !!datos.endDatetime
        || (datos.status === 'scheduled' && !datos.startDatetime)
        || (datos.startDatetime && datos.endDatetime && new Date(datos.endDatetime) <= new Date(datos.startDatetime))) {
        this.store.errorAccion.set('Revisa las fechas de inicio y fin del evento.');
        return;
      }
      const resultado = await this.store.crearCelebracion(datos);
      if (resultado) await this.router.navigate(['/eventos', resultado.id]);
    } catch (error) {
      this.store.errorAccion.set(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
    }
  }

  onCancelar(): void {
    void this.router.navigate(['/eventos']);
  }
}
