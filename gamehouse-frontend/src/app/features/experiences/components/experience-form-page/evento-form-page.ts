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
  slug = input<string>();
  protected editando = computed(() => !!this.slug());

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    if (this.slug()) void this.store.cargarEvento(this.slug()!);
  }

  async onGuardar(datos: DatosEvento): Promise<void> {
    const evento = this.store.eventoActual();
    const resultado = this.slug() && evento
      ? await this.store.modificarEvento(evento.id, datos)
      : await this.store.crearEvento(datos);
    if (resultado) await this.router.navigate(['/eventos', resultado.slug]);
  }

  onCancelar(): void {
    const slug = this.slug();
    void this.router.navigate(slug ? ['/eventos', slug] : ['/']);
  }

  reintentar(): void { if (this.slug()) void this.store.cargarEvento(this.slug()!); }
}
