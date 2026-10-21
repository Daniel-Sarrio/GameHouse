import { Component, OnInit, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { EventoForm } from '../experience-form/evento-form';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { DatosEvento } from '../../../../core/models/experience.model';
import { EventosStore } from '../../../../core/stores/experiences.store';

@Component({
  selector: 'app-evento-form-page',
  imports: [RouterLink, EventoForm, EstadoCarga, MensajeError],
  templateUrl: './evento-form-page.html',
  styleUrl: './evento-form-page.css',
})
export class EventoFormPage implements OnInit {
  protected store = inject(EventosStore);
  private readonly router = inject(Router);
  id = input<string>();
  protected editando = computed(() => this.id() !== undefined);

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    if (this.editando()) void this.store.cargarEventoPorId(Number(this.id()));
  }

  async onGuardar(datos: DatosEvento): Promise<void> {
    try {
      const evento = this.store.eventoActual();
      if (this.editando() && !evento) return;
      const resultado = this.editando() && evento
        ? await this.store.modificarEvento(evento.id, datos)
        : await this.store.crearEvento(datos);
      if (resultado) await this.router.navigate(['/experiencias', resultado.slug]);
    } catch (error) {
      this.store.errorAccion.set(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
    }
  }

  onCancelar(): void {
    const evento = this.store.eventoActual();
    void this.router.navigate(this.editando() && evento ? ['/experiencias', evento.slug] : ['/']);
  }

  reintentar(): void { if (this.editando()) void this.store.cargarEventoPorId(Number(this.id())); }
}
