import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatosEvento, OpcionesEvento } from '../../../../core/models/experience.model';
import { EventosStore } from '../../../../core/stores/experiences.store';
import { EventosService } from '../../../../core/services/experience.service';
import { EventoFormPage } from '../../components/experience-form-page/evento-form-page';

@Component({
  selector: 'app-experience-create',
  imports: [EventoFormPage],
  template: `
    <app-evento-form-page
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
export class ExperienceCreate implements OnInit {
  protected readonly store = inject(EventosStore);
  private readonly router = inject(Router);
  private readonly service = inject(EventosService);
  readonly opciones = signal<OpcionesEvento>({ hosts: [], categories: [] });
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

  async onGuardar(datos: DatosEvento): Promise<void> {
    if (this.store.guardando() || this.cargandoOpciones() || this.errorOpciones()) return;
    try {
      const resultado = await this.store.crearEvento(datos);
      if (resultado) await this.router.navigate(['/experiencias', resultado.slug]);
    } catch (error) {
      this.store.errorAccion.set(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
    }
  }

  onCancelar(): void {
    void this.router.navigate(['/']);
  }
}
