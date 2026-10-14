import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="vacio">
      <h2>{{ title() }}</h2>
      <p>{{ description() }}</p>
      @if (actionLabel(); as label) {
        <button type="button" class="boton boton-secundario" (click)="action.emit()">{{ label }}</button>
      }
    </div>
  `,
  styles: [`
    .vacio { padding: 3rem 1rem; text-align: center; border: 1px dashed var(--borde); border-radius: 18px; color: var(--suave); }
    h2 { color: var(--tinta); }
  `],
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly actionLabel = input<string>();
  readonly action = output<void>();
}
