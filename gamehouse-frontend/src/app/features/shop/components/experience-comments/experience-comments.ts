import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideMessageSquare, LucideStar, LucideTrash2 } from '@lucide/angular';
import { AuthStore } from '../../../../auth/auth.store';
import { COMMENT_MAX_LENGTH, CommentRating } from '../../../../core/models/comment.model';
import { CommentsStore } from '../../../../core/stores/comments.store';
import { Avatar } from '../../../../shared/components/avatar/avatar';

const RATINGS: CommentRating[] = [1, 2, 3, 4, 5];
const RATING_LABELS: Record<CommentRating, string> = { 1: 'Muy mala', 2: 'Mala', 3: 'Normal', 4: 'Buena', 5: 'Excelente' };

/**
 * Comentarios con valoración de 1 a 5 estrellas, bajo las fechas del detalle de una experiencia.
 * Leer es público; para comentar o borrar hace falta sesión (el backend lo exige con el middleware auth).
 */
@Component({
  selector: 'app-experience-comments',
  imports: [RouterLink, LucideMessageSquare, LucideStar, LucideTrash2, Avatar],
  template: `
    <section class="flex flex-col gap-5" aria-labelledby="comentarios-titulo">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <h2 id="comentarios-titulo" class="m-0 text-lg font-bold">Opiniones</h2>
        @if (summary().count) {
          <p class="m-0 flex items-center gap-2 text-sm text-slate-600">
            <span class="estrellas" role="img" [attr.aria-label]="'Valoración media: ' + summary().average + ' de 5'">
              @for (star of ratings; track star) {
                <span class="icono" [class.llena]="star <= roundedAverage()"><svg lucideStar [size]="16" aria-hidden="true"></svg></span>
              }
            </span>
            <strong class="text-slate-900">{{ summary().average }}</strong>
            · {{ summary().count }} {{ summary().count === 1 ? 'opinión' : 'opiniones' }}
          </p>
        }
      </header>

      @if (summary().count) {
        <ul class="m-0 flex list-none flex-col gap-1 p-0 text-xs text-slate-500" aria-label="Reparto de valoraciones">
          @for (star of ratingsDesc; track star) {
            <li class="flex items-center gap-2">
              <span class="w-14 shrink-0">{{ star }} {{ star === 1 ? 'estrella' : 'estrellas' }}</span>
              <span class="barra" aria-hidden="true"><span [style.width.%]="percentage(star)"></span></span>
              <span class="w-6 shrink-0 text-right">{{ summary().distribution[star] }}</span>
            </li>
          }
        </ul>
      }

      @if (auth.isAuthenticated()) {
        <form class="tarjeta flex flex-col gap-3" (submit)="$event.preventDefault(); submit()" aria-label="Escribe tu opinión">
          <fieldset class="m-0 border-0 p-0">
            <legend class="mb-1 text-sm font-semibold text-slate-800">Tu valoración</legend>
            <div class="selector" (mouseleave)="hovered.set(null)">
              @for (star of ratings; track star) {
                <label class="estrella" (mouseenter)="hovered.set(star)">
                  <input type="radio" name="valoracion" class="sr-only" [value]="star" [checked]="rating() === star"
                    (change)="rating.set(star)" [disabled]="busy()" />
                  <span class="icono" [class.llena]="star <= (hovered() ?? rating() ?? 0)"><svg lucideStar [size]="26" aria-hidden="true"></svg></span>
                  <span class="sr-only">{{ star }} {{ star === 1 ? 'estrella' : 'estrellas' }} ({{ labels[star] }})</span>
                </label>
              }
              @if (hovered() ?? rating(); as shown) {
                <span class="ml-2 text-sm text-slate-500">{{ labels[shown] }}</span>
              }
            </div>
          </fieldset>
          <label class="text-sm font-semibold text-slate-800" for="comentario-texto">Tu comentario</label>
          <textarea id="comentario-texto" class="campo" rows="3" [maxLength]="maxLength" [disabled]="busy()"
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
      } @else {
        <p class="tarjeta m-0 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          Inicia sesión para valorar esta experiencia y dejar tu comentario.
          <a routerLink="/login" [queryParams]="{ returnUrl: router.url }" class="boton boton-secundario no-underline">Iniciar sesión</a>
        </p>
      }

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
        <ul class="m-0 flex list-none flex-col gap-3 p-0">
          @for (comment of store.comments(); track comment.id) {
            <li class="tarjeta flex gap-3">
              <app-avatar [url]="comment.author.avatarUrl" [name]="comment.author.name" />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <strong class="text-sm text-slate-900">{{ comment.author.name }}</strong>
                  <time class="text-xs text-slate-500" [attr.datetime]="comment.createdAt">{{ date(comment.createdAt) }}</time>
                </div>
                <span class="estrellas mt-1" role="img" [attr.aria-label]="comment.rating + ' de 5 estrellas'">
                  @for (star of ratings; track star) {
                    <span class="icono" [class.llena]="star <= comment.rating"><svg lucideStar [size]="14" aria-hidden="true"></svg></span>
                  }
                </span>
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
    .estrellas { display: inline-flex; gap: 2px; color: var(--borde-fuerte); }
    /* El directivo de Lucide reescribe el class del svg: la clase va en el span que lo envuelve. */
    .icono { display: inline-flex; }
    .llena { color: #f59e0b; }
    .llena svg { fill: currentColor; }
    .selector { display: flex; align-items: center; gap: .15rem; color: var(--borde-fuerte); }
    .estrella { display: inline-flex; padding: .15rem; border-radius: 8px; cursor: pointer; }
    .estrella:has(input:focus-visible) { outline: 3px solid var(--enfoque); }
    .estrella:has(input:disabled) { cursor: not-allowed; }
    .barra { flex: 1; height: 6px; border-radius: 999px; background: var(--superficie-hundida); overflow: hidden; }
    .barra span { display: block; height: 100%; background: #f59e0b; }
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
  readonly router = inject(Router);

  readonly ratings = RATINGS;
  readonly ratingsDesc = [...RATINGS].reverse() as CommentRating[];
  readonly labels = RATING_LABELS;
  readonly maxLength = COMMENT_MAX_LENGTH;

  readonly rating = signal<CommentRating | null>(null);
  readonly hovered = signal<CommentRating | null>(null);
  readonly draft = signal('');
  readonly busy = signal(false);
  readonly formError = signal<string | null>(null);
  readonly deletingId = signal<number | null>(null);

  readonly summary = this.store.summary;
  private readonly userId = computed(() => this.auth.user()?.id ?? null);
  readonly roundedAverage = computed(() => Math.round(this.summary().average ?? 0));
  readonly canSubmit = computed(() => !this.busy() && !!this.rating() && !!this.draft().trim());

  constructor() {
    // Recarga al cambiar de experiencia o de usuario: `canDelete` depende de la sesión.
    // Solo cuenta el id: revalidar la sesión al recuperar el foco no debe recargar los comentarios.
    effect(() => {
      const slug = this.slug();
      this.userId();
      untracked(() => void this.store.load(slug));
    });
    inject(DestroyRef).onDestroy(() => this.store.cancel());
  }

  percentage(star: CommentRating): number {
    const { count, distribution } = this.summary();
    return count ? Math.round((distribution[star] / count) * 100) : 0;
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
