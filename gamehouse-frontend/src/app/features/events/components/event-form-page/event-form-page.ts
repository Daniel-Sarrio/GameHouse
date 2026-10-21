import { Component, OnInit, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { DatosCelebracion } from '../../../../core/models/event.model';
import { CelebracionesStore } from '../../../../core/stores/events.store';
import { EventForm } from '../event-form/event-form';

@Component({
  selector: 'app-event-form-page',
  imports: [RouterLink, EventForm, EstadoCarga, MensajeError],
  templateUrl: './event-form-page.html',
  styleUrl: './event-form-page.css',
})
export class EventFormPage implements OnInit {
  protected readonly store = inject(CelebracionesStore);
  private readonly router = inject(Router);
  readonly id = input<string>();
  protected readonly editando = computed(() => this.id() !== undefined);
  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    if (this.editando()) void this.store.cargarCelebracion(Number(this.id()));
  }
  async onGuardar(datos: DatosCelebracion): Promise<void> {
    if (this.store.guardando()) return;
    try {
      const actual = this.store.celebracionActual();
      if (this.editando() && !actual) return;
      const result = this.editando() && actual
        ? await this.store.modificarCelebracion(actual.id, datos)
        : await this.store.crearCelebracion(datos);
      if (result) await this.router.navigate(['/eventos', result.id]);
    } catch (error) { this.store.errorAccion.set((error as Error).message); }
  }
  onCancelar(): void { void this.router.navigate(['/eventos']); }
  reintentar(): void { if (this.editando()) void this.store.cargarCelebracion(Number(this.id())); }
}
