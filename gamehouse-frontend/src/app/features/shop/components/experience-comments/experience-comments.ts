import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, input, signal, untracked, viewChild, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { LucideMessageSquare, LucideStar, LucideTrash2, LucideX } from '@lucide/angular';
import { AuthStore } from '../../../../auth/auth.store';
import { COMMENT_MAX_LENGTH, COMMENT_SORT_OPTIONS, CommentRating, CommentSort } from '../../../../core/models/comment.model';
import { CommentsStore } from '../../../../core/stores/comments.store';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { StarRating } from '../../../../shared/components/star-rating/star-rating';
import { ReviewsOverview } from '../reviews-overview/reviews-overview';

const RATINGS: CommentRating[] = [1, 2, 3, 4, 5];
const RATING_LABELS: Record<CommentRating, string> = { 1: 'Muy mala', 2: 'Mala', 3: 'Normal', 4: 'Buena', 5: 'Excelente' };

/**
 * Opiniones bajo las fechas del detalle de una experiencia: resumen (con el análisis del agente IA),
 * formulario y listado. Leer es público; para comentar o borrar hace falta sesión (middleware auth en el backend).
 */
@Component({
  selector: 'app-experience-comments',
  imports: [LucideMessageSquare, LucideStar, LucideTrash2, LucideX, Avatar, StarRating, ReviewsOverview],
  template: `
    <section class="flex flex-col gap-6" aria-labelledby="comentarios-titulo">
      <h2 id="comentarios-titulo" class="m-0 text-xl font-bold">Opiniones</h2>

      <app-reviews-overview [summary]="store.summary()" [insights]="store.insights()"
        [insightsLoading]="store.insightsLoading()" (addReview)="openForm()" />

      @if (formOpen() && auth.isAuthenticated()) {
        <form class="tarjeta flex flex-col gap-3" (submit)="$event.preventDefault(); submit()" aria-label="Escribe tu opinión">
          <div class="flex items-start justify-between gap-3">
            <fieldset class="m-0 border-0 p-0">
              <legend class="mb-1 text-sm font-semibold text-slate-800">Tu valoración</legend>
              <div class="selector" (mouseleave)="hovered.set(null)">
                @for (star of ratings; track star) {
                  <label class="estrella" (mouseenter)="hovered.set(star)">
                    <input type="radio" name="valoracion" class="sr-only" [value]="star" [checked]="rating() === star"
                      (change)="rating.set(star)" [disabled]="busy()" />
                    <span class="icono" [class.llena]="star <= (hovered() ?? rating() ?? 0)">
                      <svg lucideStar [size]="26" aria-hidden="true"></svg>
                    </span>
                    <span class="sr-only">{{ star }} {{ star === 1 ? 'estrella' : 'estrellas' }} ({{ labels[star] }})</span>
                  </label>
                }
                @if (hovered() ?? rating(); as shown) {
                  <span class="ml-2 text-sm text-slate-500">{{ labels[shown] }}</span>
                }
              </div>
            </fieldset>
            <button type="button" class="cerrar" (click)="closeForm()" aria-label="Cerrar formulario">
              <svg lucideX [size]="18" aria-hidden="true"></svg>
            </button>
          </div>
          <label class="text-sm font-semibold text-slate-800" for="comentario-texto">Tu comentario</label>
          <textarea #texto id="comentario-texto" class="campo" rows="3" [maxLength]="maxLength" [disabled]="busy()"
            placeholder="Cuenta qué te ha parecido la experiencia…" [value]="draft()"
            (input)="draft.set($any($event.target).value)"></textarea>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <span class="text-xs text-slate-500">{{ draft().length }} / {{ maxLength }}</span>
            <button type="submit" class="boton boton-primario" [disabled]="!canSubmit()">
              {{ busy() ? 'Publicando…' : 'Publicar opinión' }}
            </button>
          </div>
          @if (formError(); as message) {
            <p class="m-0 text-sm text-red-700" role="alert">{{ message }}</p>
          }
        </form>
      }

      <div class="flex flex-col gap-4">
        <h3 class="m-0 text-lg font-bold">Opiniones de usuarios</h3>
        <div class="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
          <p class="m-0 flex flex-col text-sm text-slate-700">
            <span class="text-xs text-slate-500">Total</span>
            {{ store.summary().count }} {{ store.summary().count === 1 ? 'opinión' : 'opiniones' }}
          </p>
          @if (store.summary().count > 1) {
            <label class="orden">
              <span>Ordenar</span>
              <select [value]="store.sort()" (change)="sort($any($event.target).value)" [disabled]="store.loading()">
                @for (option of sortOptions; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </label>
          }
        </div>

        @if (store.error(); as error) {
          <p class="m-0 text-sm text-red-700" role="alert">
            {{ error }} <button type="button" class="font-semibold underline" (click)="reload()">Reintentar</button>
          </p>
        } @else if (store.loading() && !store.comments().length) {
          <p class="m-0 text-sm text-slate-500" aria-live="polite">Cargando opiniones…</p>
        } @else if (!store.comments().length) {
          <p class="m-0 flex items-center gap-2 rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
            <svg lucideMessageSquare [size]="16" aria-hidden="true"></svg> Todavía no hay opiniones. ¡Sé el primero en comentar!
          </p>
        } @else {
          <ul class="m-0 flex list-none flex-col gap-3 p-0" [attr.aria-busy]="store.loading()">
            @for (comment of store.comments(); track comment.id) {
              <li class="tarjeta flex gap-3">
                <app-avatar [url]="comment.author.avatarUrl" [name]="comment.author.name" />
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <strong class="text-sm text-slate-900">{{ comment.author.name }}</strong>
                    <time class="text-xs text-slate-500" [attr.datetime]="comment.createdAt">{{ date(comment.createdAt) }}</time>
                  </div>
                  <app-star-rating class="mt-1" [value]="comment.rating" [size]="14" />
                  <p class="mt-2 mb-0 text-sm leading-6 break-words whitespace-pre-line text-slate-700">{{ comment.body }}</p>
                  @if (comment.canDelete) {
                    <button type="button" class="borrar" (click)="remove(comment.id)" [disabled]="deletingId() === comment.id">
                      <svg lucideTrash2 [size]="13" aria-hidden="true"></svg>
                      {{ deletingId() === comment.id ? 'Borrando…' : 'Borrar' }}
                    </button>
                  }
                </div>
              </li>
            }
          </ul>
          @if (store.hasMore()) {
            <button type="button" class="boton boton-secundario self-center" (click)="store.loadMore()" [disabled]="store.loadingMore()">
              {{ store.loadingMore() ? 'Cargando…' : 'Ver más opiniones' }}
            </button>
          }
        }
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .tarjeta { padding: 1rem 1.1rem; border: 1px solid var(--borde); border-radius: 14px; background: var(--superficie); }
    .campo {
      width: 100%; resize: vertical; padding: .7rem .85rem; border: 1.5px solid var(--borde); border-radius: 12px;
      background: var(--superficie); color: var(--tinta);
    }
    .campo:focus-visible { outline: 3px solid var(--enfoque); outline-offset: 1px; border-color: var(--azul); }
    /* El directivo de Lucide reescribe el class del svg: la clase va en el span que lo envuelve. */
    .icono { display: inline-flex; }
    .llena { color: #f59e0b; }
    .llena svg { fill: currentColor; }
    .selector { display: flex; align-items: center; gap: .15rem; color: var(--borde-fuerte); }
    .estrella { display: inline-flex; padding: .15rem; border-radius: 8px; cursor: pointer; }
    .estrella:has(input:focus-visible) { outline: 3px solid var(--enfoque); }
    .estrella:has(input:disabled) { cursor: not-allowed; }
    .cerrar { display: inline-flex; padding: .3rem; border: 0; border-radius: 8px; background: none; color: var(--suave); }
    .cerrar:hover { background: var(--superficie-hover); }
    .orden { position: relative; display: flex; flex-direction: column; min-width: 12rem; }
    .orden span {
      position: absolute; top: -.55rem; left: .7rem; padding: 0 .3rem; background: var(--fondo);
      font-size: .72rem; font-weight: 700; color: var(--texto-secundario);
    }
    .orden select {
      padding: .65rem .85rem; border: 1.5px solid var(--borde); border-radius: 10px; background: var(--superficie);
      color: var(--tinta); font-size: .875rem;
    }
    .orden select:focus-visible { outline: 3px solid var(--enfoque); outline-offset: 1px; }
    .borrar {
      margin-top: .5rem; display: inline-flex; align-items: center; gap: .3rem; padding: 0; border: 0;
      background: none; color: var(--peligro); font-size: .78rem; font-weight: 600;
    }
    .borrar:hover { text-decoration: underline; }
    .borrar:disabled { opacity: .6; cursor: not-allowed; }
  `],
})
export class ExperienceComments {
  readonly slug = input.required<string>();

  readonly store = inject(CommentsStore);
  readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('texto');

  readonly ratings = RATINGS;
  readonly labels = RATING_LABELS;
  readonly maxLength = COMMENT_MAX_LENGTH;
  readonly sortOptions = COMMENT_SORT_OPTIONS;

  readonly formOpen = signal(false);
  readonly rating = signal<CommentRating | null>(null);
  readonly hovered = signal<CommentRating | null>(null);
  readonly draft = signal('');
  readonly busy = signal(false);
  readonly formError = signal<string | null>(null);
  readonly deletingId = signal<number | null>(null);

  private readonly userId = computed(() => this.auth.user()?.id ?? null);
  readonly canSubmit = computed(() => !this.busy() && !!this.rating() && !!this.draft().trim());

  constructor() {
    // Recarga al cambiar de experiencia o de usuario: `canDelete` depende de la sesión.
    // Solo cuenta el id: revalidar la sesión al recuperar el foco no debe recargar los comentarios.
    effect(() => {
      const slug = this.slug();
      this.userId();
      untracked(() => void this.store.load(slug));
    });
    // El análisis del agente IA no depende de la sesión: solo se pide al cambiar de experiencia.
    effect(() => {
      const slug = this.slug();
      untracked(() => void this.store.loadInsights(slug));
    });
    inject(DestroyRef).onDestroy(() => this.store.cancel());
  }

  /** "Añadir opinión": abre el formulario, o lleva al login y vuelve a este detalle. */
  openForm(): void {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.formOpen.set(true);
    afterNextRender(() => this.textarea()?.nativeElement.focus(), { injector: this.injector });
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.formError.set(null);
  }

  sort(value: CommentSort): void {
    void this.store.setSort(value);
  }

  date(value: string): string {
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
  }

  async submit(): Promise<void> {
    const rating = this.rating();
    const body = this.draft().trim();
    if (!this.canSubmit() || !rating) return;
    this.busy.set(true);
    this.formError.set(null);
    try {
      await this.store.create({ rating, body });
      this.rating.set(null);
      this.draft.set('');
      this.formOpen.set(false);
    } catch (error) {
      this.formError.set(this.errorMessage(error, 'No se pudo publicar tu opinión.'));
    } finally {
      this.busy.set(false);
    }
  }

  async remove(id: number): Promise<void> {
    if (this.deletingId() !== null || !window.confirm('¿Borrar este comentario? No se puede deshacer.')) return;
    this.deletingId.set(id);
    try {
      await this.store.remove(id);
    } catch (error) {
      this.formError.set(this.errorMessage(error, 'No se pudo borrar el comentario.'));
    } finally {
      this.deletingId.set(null);
    }
  }

  reload(): void {
    void this.store.load(this.slug());
  }

  // El interceptor de errores ya muestra una alerta con el detalle; un 401 significa que la sesión terminó.
  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && error.status === 401) return 'Tu sesión ha terminado. Inicia sesión de nuevo para continuar.';
    return error instanceof Error && error.message ? error.message : fallback;
  }
}
