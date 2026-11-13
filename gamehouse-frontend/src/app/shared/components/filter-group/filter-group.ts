import { Component, computed, input, output, signal } from '@angular/core';

export interface FilterOption {
  id: number;
  label: string;
  hint?: string;
  count?: number;
}

const VISIBLE_OPTIONS = 6;

/** Lista de casillas reutilizable para cualquier filtro por IDs (categorías, organizadores, lugares...). */
@Component({
  selector: 'app-filter-group',
  template: `
    <fieldset class="border-0 p-0">
      <legend class="mb-2 flex w-full items-center justify-between text-sm font-bold text-slate-900">
        {{ title() }}
        @if (selected().length) {
          <button type="button" class="text-xs font-semibold text-acento-texto hover:underline" (click)="selectedChange.emit([])">
            Quitar
          </button>
        }
      </legend>
      @if (!options().length) {
        <p class="text-sm text-slate-400">{{ emptyText() }}</p>
      }
      <ul class="m-0 flex list-none flex-col gap-1 p-0">
        @for (option of visibleOptions(); track option.id) {
          <li>
            <label class="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              <input type="checkbox" class="h-4 w-4 accent-acento" [checked]="isSelected(option.id)" (change)="toggle(option.id)" />
              <span class="min-w-0 flex-1">
                <span class="block truncate">{{ option.label }}</span>
                @if (option.hint) { <span class="block truncate text-xs text-slate-400">{{ option.hint }}</span> }
              </span>
              @if (option.count !== undefined) {
                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{{ option.count }}</span>
              }
            </label>
          </li>
        }
      </ul>
      @if (options().length > visibleLimit) {
        <button type="button" class="mt-1 px-2 text-xs font-semibold text-acento-texto hover:underline" (click)="expanded.update((value) => !value)">
          {{ expanded() ? 'Ver menos' : 'Ver ' + (options().length - visibleLimit) + ' más' }}
        </button>
      }
    </fieldset>
  `,
})
export class FilterGroup {
  readonly title = input.required<string>();
  readonly options = input.required<FilterOption[]>();
  readonly selected = input<number[]>([]);
  readonly emptyText = input('No hay opciones disponibles.');
  readonly selectedChange = output<number[]>();

  readonly visibleLimit = VISIBLE_OPTIONS;
  readonly expanded = signal(false);
  // Las opciones seleccionadas siempre se muestran, aunque estén más abajo en la lista.
  readonly visibleOptions = computed(() =>
    this.expanded()
      ? this.options()
      : this.options().filter((option, index) => index < VISIBLE_OPTIONS || this.isSelected(option.id)),
  );

  isSelected(id: number): boolean {
    return this.selected().includes(id);
  }

  toggle(id: number): void {
    this.selectedChange.emit(
      this.isSelected(id) ? this.selected().filter((value) => value !== id) : [...this.selected(), id],
    );
  }
}
