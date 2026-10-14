import { Injectable, computed, inject, signal } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly spinner = inject(NgxSpinnerService);
  private readonly activeRequests = signal(0);
  private readonly activeMutations = signal(0);
  readonly loading = computed(() => this.activeRequests() > 0);

  show(blocking = false): void {
    this.activeRequests.update((count) => count + 1);
    if (blocking) {
      this.activeMutations.update((count) => count + 1);
      void this.spinner.show('admin-actions');
    }
  }

  hide(blocking = false): void {
    this.activeRequests.update((count) => Math.max(0, count - 1));
    if (blocking) {
      this.activeMutations.update((count) => Math.max(0, count - 1));
      if (this.activeMutations() === 0) void this.spinner.hide('admin-actions');
    }
  }
}
