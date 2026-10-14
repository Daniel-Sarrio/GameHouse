import { Component } from '@angular/core';
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader';

@Component({
  selector: 'app-skeleton-loader',
  imports: [NgxSkeletonLoaderComponent],
  template: `
    <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Cargando experiencias">
      @for (item of [1, 2, 3]; track item) {
        <div class="rounded-2xl border border-slate-200 bg-white p-5">
          <ngx-skeleton-loader appearance="line" [theme]="{ height: '140px', borderRadius: '12px' }" />
          <ngx-skeleton-loader appearance="line" [theme]="{ height: '26px', width: '70%' }" />
          <ngx-skeleton-loader [count]="2" appearance="line" />
        </div>
      }
    </div>
  `,
})
export class SkeletonLoader {}
