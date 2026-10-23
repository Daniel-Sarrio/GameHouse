import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatosEvento, OpcionesEvento } from '../../../../core/models/experience.model';
import { EventosStore } from '../../../../core/stores/experiences.store';
import { EventosService } from '../../../../core/services/experience.service';
import { EventoFormPage } from '../../components/experience-form-page/evento-form-page';

@Component({
  selector: 'app-experience-edit',
  imports: [EventoFormPage],
  template: `
    <app-evento-form-page
      [editando]="true"
      [evento]="store.eventoActual()"
      [cargando]="store.cargandoDetalle()"
      [errorCarga]="store.errorDetalle()"
      (reintentar)="cargarDatos()"
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
export class ExperienceEdit implements OnInit {
  protected readonly store = inject(EventosStore);
  private readonly router = inject(Router);
  readonly id = input.required<string>();
  private readonly service = inject(EventosService);
  readonly opciones = signal<OpcionesEvento>({ hosts: [], categories: [] });
  readonly cargandoOpciones = signal(false);
  readonly errorOpciones = signal<string | null>(null);

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    void this.cargarDatos();
    void this.cargarOpciones();
  }

  async cargarDatos(): Promise<void> {
    await this.store.cargarEventoPorId(Number(this.id()));
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

  async onGuardar(datos: DatosEvento): Promise<void> {
    if (this.store.guardando() || this.cargandoOpciones() || this.errorOpciones()) return;
    const actual = this.store.eventoActual();
    if (!actual) return;
    try {
      const resultado = await this.store.modificarEvento(actual.id, datos);
      if (resultado) await this.router.navigate(['/experiencias', resultado.slug]);
    } catch (error) {
      this.store.errorAccion.set(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
    }
  }

  onCancelar(): void {
    void this.router.navigate(this.store.eventoActual() ? ['/experiencias', this.store.eventoActual()!.slug] : ['/']);
  }
}
