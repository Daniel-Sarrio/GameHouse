import { Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';
import { NgxSpinnerComponent } from 'ngx-spinner';

@Component({
  selector: 'app-loader',
  imports: [NgxSpinnerComponent],
  template: `
    <ngx-spinner name="admin-actions" type="ball-clip-rotate" [fullScreen]="true" [bdColor]="'rgba(15, 23, 42, 0.48)'">
      <p class="spinner-label">Guardando cambios…</p>
    </ngx-spinner>
    @if (loading.loading()) { <span class="sr-only" role="status">Cargando…</span> }
  `,
  styles: [`.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; } .spinner-label { color: white; font-weight: 700; margin-top: 1rem; }`],
})
export class Loader {
  readonly loading = inject(LoadingService);
}
