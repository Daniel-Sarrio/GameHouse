import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, input, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideExternalLink, LucideMessageSquare, LucideSparkles, LucideThumbsDown, LucideThumbsUp, LucideTrash2,
} from '@lucide/angular';
import { COMMENT_SORT_OPTIONS, CommentSort } from '../../../../core/models/comment.model';
import { ReviewsStore } from '../../../../core/stores/reviews.store';
import { StarRating } from '../../../../shared/components/star-rating/star-rating';
import { SentimentBalanceChart } from '../../components/sentiment-balance/sentiment-balance';

const parseId = (value: string | undefined): number | null => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

/**
 * Opiniones en el panel de administración: experiencias con opiniones, sus comentarios (con moderación) y el
 * análisis del agente IA bajo demanda: lo positivo, lo negativo y la balanza de sentimiento.
 */
@Component({
  selector: 'app-reviews-admin',
  imports: [
    DatePipe, RouterLink, StarRating, SentimentBalanceChart,
    LucideExternalLink, LucideMessageSquare, LucideSparkles, LucideThumbsDown, LucideThumbsUp, LucideTrash2,
  ],
  providers: [ReviewsStore],
  template: `
    <section class="p-6 sm:p-10">
      <header class="mb-8">
        <p class="text-xs font-bold uppercase tracking-widest text-acento-texto">Administración</p>
        <h1 class="mt-2 text-3xl font-bold">Opiniones</h1>
        <p class="mt-2 text-sm text-slate-500">
          Revisa lo que opinan los usuarios de cada experiencia y analízalo con el asistente IA.
        </p>
      </header>

      @if (store.error(); as error) {
        <p class="mb-4 rounded-xl bg-red-50 p-4 text-red-700" role="alert">{{ error }}</p>
      }

      <div class="grid items-start gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <nav aria-label="Experiencias con opiniones" class="flex flex-col gap-2">
          @if (store.loadingExperiences() && !store.experiences().length) {
            <p class="text-sm text-slate-500">Cargando experiencias…</p>
          } @else if (!store.experiences().length) {
            <p class="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              Todavía no hay opiniones en ninguna experiencia.
            </p>
          }
          @for (item of store.experiences(); track item.id) {
            <a [routerLink]="[]" [queryParams]="{ experiencia: item.id }" queryParamsHandling="merge"
              class="experiencia" [class.activa]="item.id === store.selectedId()"
              [attr.aria-current]="item.id === store.selectedId() ? 'true' : null">
              <span class="flex items-start justify-between gap-2">
                <strong class="text-sm text-slate-900">{{ item.name }}</strong>
                @if (item.status !== 'published') {
                  <span class="etiqueta">{{ item.status }}</span>
                }
              </span>
              <span class="flex items-center gap-2 text-xs text-slate-500">
                <app-star-rating [value]="item.average" [size]="12" />
                {{ item.average }} · {{ item.commentCount }} {{ item.commentCount === 1 ? 'opinión' : 'opiniones' }}
              </span>
              <span class="text-xs" [class]="item.analyzedAt ? (item.analysisFresh ? 'text-emerald-700' : 'text-amber-700') : 'text-slate-400'">
                {{ item.analyzedAt ? (item.analysisFresh ? 'Análisis IA al día' : 'Análisis IA desactualizado') : 'Sin analizar' }}
              </span>
            </a>
          }
        </nav>

        @if (store.selected(); as experience) {
          <div class="flex min-w-0 flex-col gap-6">
            <section class="panel flex flex-col gap-5" aria-labelledby="analisis-titulo">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 id="analisis-titulo" class="m-0 text-xl font-bold">{{ experience.name }}</h2>
                  <a [routerLink]="['/tienda', experience.slug]" target="_blank"
                    class="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-acento-texto">
                    Ver en la tienda <svg lucideExternalLink [size]="12" aria-hidden="true"></svg>
                  </a>
                </div>
                <button type="button" class="boton boton-primario inline-flex items-center gap-2"
                  [disabled]="store.generating() || !store.analysis()?.commentCount" (click)="store.analyze()">
                  <svg lucideSparkles [size]="16" aria-hidden="true"></svg>
                  {{ store.generating() ? 'Analizando…' : (analysis() ? 'Volver a analizar' : 'Analizar opiniones') }}
                </button>
              </div>

              @if (store.generating()) {
                <p class="aviso info" role="status" aria-live="polite">
                  El asistente IA está leyendo las {{ store.analysis()?.commentCount }} opiniones. Puede tardar hasta un minuto.
                </p>
              } @else if (store.analysis()?.lastFailedAt && !analysis()) {
                <p class="aviso error" role="alert">
                  El asistente IA no pudo analizar las opiniones. Inténtalo de nuevo en unos minutos.
                </p>
              }

              @if (analysis(); as result) {
                @if (result.stale) {
                  <p class="aviso alerta">
                    Este análisis no incluye las opiniones más recientes. Vuelve a analizar para actualizarlo.
                  </p>
                }
                <div class="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
                  @if (result.sentiment.positive + result.sentiment.neutral + result.sentiment.negative) {
                    <app-sentiment-balance [balance]="result.sentiment" />
                  } @else {
                    <!-- Análisis anterior a la balanza: no se muestra un falso "equilibrado". -->
                    <p class="aviso alerta self-start">Este análisis es anterior a la balanza. Vuelve a analizar para obtenerla.</p>
                  }
                  <div class="grid gap-4 sm:grid-cols-2">
                    <div class="lista positivo">
                      <h3 class="flex items-center gap-2"><svg lucideThumbsUp [size]="16" aria-hidden="true"></svg> Lo positivo</h3>
                      @if (result.positives.length) {
                        <ul>@for (point of result.positives; track point) { <li>{{ point }}</li> }</ul>
                      } @else { <p>No se repite ningún punto positivo.</p> }
                    </div>
                    <div class="lista negativo">
                      <h3 class="flex items-center gap-2"><svg lucideThumbsDown [size]="16" aria-hidden="true"></svg> Lo negativo</h3>
                      @if (result.negatives.length) {
                        <ul>@for (point of result.negatives; track point) { <li>{{ point }}</li> }</ul>
                      } @else { <p>No se repite ningún punto negativo.</p> }
                    </div>
                    @if (result.summary) {
                      <p class="m-0 text-sm leading-6 text-slate-600 sm:col-span-2">{{ result.summary }}</p>
                    }
                  </div>
                </div>
                <p class="m-0 text-xs text-slate-500">
                  {{ result.analyzedCount }} {{ result.analyzedCount === 1 ? 'opinión analizada' : 'opiniones analizadas' }}
                  · {{ result.recommendPercent }}% recomiendan · {{ result.generatedAt | date: 'd MMM y, HH:mm' }}
                </p>
              } @else if (!store.generating() && store.analysis()) {
                <p class="m-0 text-sm text-slate-500">
                  Pulsa «Analizar opiniones» para que el asistente IA resuma lo positivo y lo negativo y calcule la balanza.
                </p>
              }
            </section>

            <section class="panel flex flex-col gap-4" aria-labelledby="comentarios-titulo">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 id="comentarios-titulo" class="m-0 flex items-center gap-2 text-lg font-bold">
                  <svg lucideMessageSquare [size]="18" aria-hidden="true"></svg>
                  Comentarios ({{ store.comments()?.summary?.count ?? experience.commentCount }})
                </h2>
                <label class="flex items-center gap-2 text-sm text-slate-600">Ordenar
                  <select class="rounded-lg border border-slate-300 bg-superficie px-3 py-2" [value]="store.sort()"
                    (change)="sort($any($event.target).value)">
                    @for (option of sortOptions; track option.value) { <option [value]="option.value">{{ option.label }}</option> }
                  </select>
                </label>
              </div>
              @if (store.loadingComments() && !store.comments()) {
                <p class="m-0 text-sm text-slate-500">Cargando comentarios…</p>
              }
              <ul class="m-0 flex list-none flex-col divide-y divide-slate-100 p-0" [attr.aria-busy]="store.loadingComments()">
                @for (comment of store.comments()?.items ?? []; track comment.id) {
                  <li class="flex flex-col gap-1 py-4">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <span class="text-sm"><strong class="text-slate-900">{{ comment.author.name || 'Sin nombre' }}</strong>
                        <span class="text-slate-500"> · {{ comment.author.email }}</span></span>
                      <time class="text-xs text-slate-500" [attr.datetime]="comment.createdAt">{{ comment.createdAt | date: 'd MMM y, HH:mm' }}</time>
                    </div>
                    <app-star-rating [value]="comment.rating" [size]="13" />
                    <p class="m-0 text-sm leading-6 break-words whitespace-pre-line text-slate-700">{{ comment.body }}</p>
                    <button type="button" class="borrar" (click)="remove(comment.id)">
                      <svg lucideTrash2 [size]="13" aria-hidden="true"></svg> Borrar
                    </button>
                  </li>
                }
              </ul>
              @if ((store.comments()?.pagination?.totalPages ?? 1) > 1) {
                <div class="flex items-center justify-center gap-3 text-sm">
                  <button type="button" class="boton boton-secundario" [disabled]="store.page() <= 1" (click)="store.setPage(store.page() - 1)">Anterior</button>
                  <span>Página {{ store.page() }} de {{ store.comments()!.pagination.totalPages }}</span>
                  <button type="button" class="boton boton-secundario" [disabled]="store.page() >= store.comments()!.pagination.totalPages"
                    (click)="store.setPage(store.page() + 1)">Siguiente</button>
                </div>
              }
            </section>
          </div>
        } @else if (store.experiences().length) {
          <p class="panel text-sm text-slate-500">Elige una experiencia para ver sus opiniones y analizarlas.</p>
        }
      </div>
    </section>
  `,
  styles: [`
    /* Avisos con las variables del tema para que se lean igual en claro y en oscuro. */
    .aviso { margin: 0; padding: .85rem 1rem; border-radius: 12px; font-size: .875rem; }
    .aviso.info { background: var(--info-suave); color: var(--info-texto); }
    .aviso.alerta { background: var(--aviso-suave); color: var(--aviso-texto); }
    .aviso.error { background: var(--peligro-suave); color: var(--peligro-texto); }
    .panel { padding: 1.5rem; border: 1px solid var(--borde); border-radius: 18px; background: var(--superficie); }
    .experiencia {
      display: flex; flex-direction: column; gap: .35rem; padding: .9rem 1rem; border: 1.5px solid var(--borde);
      border-radius: 14px; background: var(--superficie); text-decoration: none; transition: border-color .15s;
    }
    .experiencia:hover { border-color: var(--acento-borde); }
    .experiencia.activa { border-color: var(--azul); box-shadow: 0 0 0 3px rgb(52 72 220 / .12); }
    .etiqueta { padding: .1rem .45rem; border-radius: 999px; background: var(--aviso-suave); color: var(--aviso-texto); font-size: .68rem; font-weight: 700; }
    .lista { padding: 1rem; border-radius: 14px; }
    .lista h3 { margin: 0 0 .6rem; font-size: .95rem; font-weight: 700; }
    .lista ul { margin: 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: .35rem; font-size: .875rem; }
    .lista p { margin: 0; font-size: .85rem; opacity: .8; }
    .lista.positivo { background: var(--exito-suave); color: var(--exito-texto); }
    .lista.negativo { background: var(--peligro-suave); color: var(--peligro-texto); }
    .borrar {
      align-self: flex-start; display: inline-flex; align-items: center; gap: .3rem; padding: 0; border: 0;
      background: none; color: var(--peligro); font-size: .78rem; font-weight: 600;
    }
    .borrar:hover { text-decoration: underline; }
  `],
})
export class ReviewsAdmin {
  /** Query param ?experiencia=ID (input binding), para enlazar directamente a una experiencia. */
  readonly experiencia = input<string>();

  readonly store = inject(ReviewsStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly sortOptions = COMMENT_SORT_OPTIONS;
  readonly analysis = computed(() => this.store.analysis()?.analysis ?? null);

  constructor() {
    void this.store.loadExperiences().then(() => {
      // Sin experiencia en la URL, se abre la que tiene la opinión más reciente.
      const first = this.store.experiences()[0];
      if (!parseId(this.experiencia()) && first) {
        void this.router.navigate([], { relativeTo: this.route, queryParams: { experiencia: first.id }, replaceUrl: true });
      }
    });
    effect(() => {
      const id = parseId(this.experiencia());
      untracked(() => void this.store.select(id));
    });
    inject(DestroyRef).onDestroy(() => this.store.destroy());
  }

  sort(value: CommentSort): void {
    void this.store.setSort(value);
  }

  async remove(id: number): Promise<void> {
    if (!window.confirm('¿Borrar este comentario? Dejará de mostrarse en la tienda.')) return;
    await this.store.removeComment(id).catch(() => undefined);
  }
}
