import { Injectable } from '@angular/core';
import Swal from 'sweetalert2/dist/sweetalert2.esm.all.js';

@Injectable({ providedIn: 'root' })
export class AlertService {
  error(message: string): void {
    void Swal.fire({
      icon: 'error',
      title: 'No se pudo completar la operación',
      text: message,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#3448dc',
    });
  }
}
