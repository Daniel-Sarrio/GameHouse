import { Component, computed, input, signal } from '@angular/core';

@Component({
  selector: 'app-avatar',
  host: { class: 'inline-flex shrink-0' },
  template: `
    @if (url() && failedUrl() !== url()) {
      <img [src]="url()" [alt]="'Avatar de ' + name()" (error)="failedUrl.set(url())"
        class="h-11 w-11 rounded-full object-cover" referrerpolicy="no-referrer" />
    } @else {
      <span class="grid h-11 w-11 place-items-center rounded-full bg-indigo-100 font-bold text-indigo-700"
        role="img" [attr.aria-label]="'Avatar de ' + name()">{{ initials() }}</span>
    }
  `,
})
export class Avatar {
  readonly url = input<string | null | undefined>();
  readonly name = input('Usuario');
  readonly failedUrl = signal<string | null | undefined>(undefined);
  readonly initials = computed(() => this.name().trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase() || 'U');
}
