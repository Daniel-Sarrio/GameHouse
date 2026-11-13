import { Injectable, Injector, inject } from '@angular/core';
import Swal from 'sweetalert2/dist/sweetalert2.esm.all.js';
import { ThemeStore } from '../stores/theme.store';

@Injectable({ providedIn: 'root' })
export class AlertService {
  // El tema se resuelve al mostrar la alerta: así los servicios de API no dependen del DOM.
  private readonly injector = inject(Injector);

  error(message: string): void {
    void Swal.fire({
      icon: 'error',
      title: 'No se pudo completar la operación',
      text: message,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#3448dc',
      theme: this.injector.get(ThemeStore).theme(),
    });
  }
}
