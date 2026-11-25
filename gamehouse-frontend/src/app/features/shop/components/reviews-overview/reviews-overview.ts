import { Component, computed, input, output } from '@angular/core';
import {
  LucideBadgeEuro, LucideBuilding2, LucideClipboardList, LucideGamepad2, LucideMapPin, LucidePartyPopper,
  LucideSmile, LucideSparkles, LucideStar, LucideUsers,
} from '@lucide/angular';
import { CommentInsights, CommentRating, CommentSummary } from '../../../../core/models/comment.model';
import { StarRating } from '../../../../shared/components/star-rating/star-rating';

/**
 * Resumen de opiniones: media y número de opiniones, porcentaje que recomienda, reparto por estrellas,
 * valoración por aspectos y resumen. Recomendaciones, aspectos y resumen los calcula el agente IA
 * leyendo los comentarios; la media y el reparto salen directamente de las valoraciones.
 */
@Component({
  selector: 'app-reviews-overview',
  imports: [
    StarRating, LucideStar, LucideSparkles, LucideClipboardList, LucidePartyPopper, LucideBuilding2,
    LucideGamepad2, LucideUsers, LucideBadgeEuro, LucideSmile, LucideMapPin,
  ],
  template: `
    <div class="resumen">
      <div class="tarjetas">
        <div class="tarjeta">
          <strong class="cifra">{{ averageText() }}</strong>
          <app-star-rating [value]="summary().average ?? 0" [size]="15" />
          <span class="pie-tarjeta">{{ summary().count }} {{ summary().count === 1 ? 'opinión' : 'opiniones' }}</span>
        </div>
        <div class="tarjeta" [attr.aria-busy]="insightsLoading()">
          @switch (ready()?.status) {
            @case ('ready') {
              <strong class="cifra">{{ ready()!.recommendPercent }}%</strong>
              <span class="text-sm font-bold text-slate-800">Recomiendan</span>
              <span class="pie-tarjeta">{{ ready()!.recommendCount }} {{ ready()!.recommendCount === 1 ? 'recomendación' : 'recomendaciones' }}</span>
            }
            @default {
              @if (insightsLoading() || insights()?.status === 'pending') {
                <span class="cargando" aria-hidden="true"></span>
                <span class="pie-tarjeta">Analizando opiniones…</span>
              } @else {
                <strong class="cifra text-slate-400">—</strong>
                <span class="text-sm font-bold text-slate-800">Recomiendan</span>
                <span class="pie-tarjeta">{{ pendingText() }}</span>
              }
            }
          }
        </div>
      </div>

      <ul class="reparto" aria-label="Reparto de valoraciones">
        @for (star of ratingsDesc; track star) {
          <li>
            <span class="flex w-7 shrink-0 items-center gap-0.5">{{ star }}
              <span class="estrella-llena"><svg lucideStar [size]="12" aria-hidden="true"></svg></span></span>
            <span class="barra" aria-hidden="true"><span [style.width.%]="percentage(star)"></span></span>
            <span class="w-6 shrink-0 text-right">{{ summary().distribution[star] }}</span>
            <span class="sr-only">{{ star }} estrellas: {{ summary().distribution[star] }}</span>
          </li>
        }
      </ul>

      @if (ready(); as insights) {
        @if (insights.aspects.length) {
          <ul class="aspectos" aria-label="Valoración por aspectos">
            @for (aspect of insights.aspects; track aspect.key) {
              <li>
                <span class="icono-aspecto" aria-hidden="true">
                  @switch (aspect.key) {
                    @case ('organizacion') { <svg lucideClipboardList [size]="16"></svg> }
                    @case ('ambiente') { <svg lucidePartyPopper [size]="16"></svg> }
                    @case ('instalaciones') { <svg lucideBuilding2 [size]="16"></svg> }
                    @case ('equipamiento') { <svg lucideGamepad2 [size]="16"></svg> }
                    @case ('personal') { <svg lucideUsers [size]="16"></svg> }
                    @case ('calidad_precio') { <svg lucideBadgeEuro [size]="16"></svg> }
                    @case ('diversion') { <svg lucideSmile [size]="16"></svg> }
                    @case ('ubicacion') { <svg lucideMapPin [size]="16"></svg> }
                  }
                </span>
                <span class="min-w-0 flex-1 truncate">{{ aspect.label }}</span>
                <app-star-rating [value]="aspect.rating" [size]="14" />
              </li>
            }
          </ul>
        }
      }

      <div class="cta">
        <h3 class="m-0 text-base font-bold text-slate-900">Deja tu opinión</h3>
        <p class="m-0 text-sm text-slate-600">Te costará un minuto y ayudarás a otros jugadores a decidirse.</p>
        <button type="button" class="boton boton-primario mt-1 self-start" (click)="addReview.emit()">Añadir opinión</button>
      </div>
    </div>

    @if (ready(); as insights) {
      @if (insights.summary) {
        <p class="ia">
          <span class="etiqueta-ia"><svg lucideSparkles [size]="13" aria-hidden="true"></svg> Resumen IA</span>
          <span>{{ insights.summary }}</span>
        </p>
      }
      <p class="m-0 text-xs text-slate-500">
        Recomendaciones, aspectos y resumen generados por el asistente IA de GameHouse a partir de {{ insights.analyzedCount }}
        {{ insights.analyzedCount === 1 ? 'opinión' : 'opiniones' }}.@if (insights.refreshing) { Actualizando con las opiniones más recientes… } @else if (insights.stale) { Puede no incluir las opiniones más recientes. }
      </p>
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; gap: .9rem; }
    .resumen { display: grid; gap: 1.25rem 1.75rem; grid-template-columns: 1fr; align-items: start; }
    @media (min-width: 640px) { .resumen { grid-template-columns: auto minmax(0, 1fr); } }
    @media (min-width: 1100px) { .resumen { grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr); } }
    .tarjetas { display: grid; grid-template-columns: repeat(2, minmax(8.5rem, 1fr)); gap: .75rem; }
    .tarjeta {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .35rem; min-height: 9rem;
      padding: 1rem .75rem; border-radius: 14px; background: var(--superficie-hundida); text-align: center;
    }
    .cifra { font-size: 2rem; line-height: 1; font-weight: 800; color: var(--tinta); }
    .pie-tarjeta { font-size: .75rem; color: var(--suave); }
    .cargando { width: 4.5rem; height: 2rem; border-radius: 8px; background: var(--esqueleto); animation: pulso 1.2s ease-in-out infinite; }
    @keyframes pulso { 50% { opacity: .45; } }
    .reparto, .aspectos { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: .45rem; font-size: .8rem; color: var(--texto-secundario); }
    .reparto li, .aspectos li { display: flex; align-items: center; gap: .6rem; }
    .estrella-llena { display: inline-flex; color: #f59e0b; }
    .estrella-llena svg { fill: currentColor; }
    .barra { flex: 1; height: 6px; border-radius: 999px; background: var(--superficie-hundida); overflow: hidden; }
    .barra span { display: block; height: 100%; border-radius: 999px; background: var(--tinta); }
    .icono-aspecto { display: inline-flex; color: var(--suave); }
    .cta { display: flex; flex-direction: column; gap: .35rem; }
    @media (min-width: 640px) and (max-width: 1099px) { .cta { grid-column: 1 / -1; } }
    .ia {
      margin: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: .5rem; padding: .8rem 1rem; border-radius: 12px;
      background: var(--acento-suave); color: var(--texto-secundario); font-size: .875rem; line-height: 1.5;
    }
    .etiqueta-ia {
      display: inline-flex; align-items: center; gap: .3rem; padding: .1rem .5rem; border-radius: 999px;
      background: var(--superficie); color: var(--acento-texto); font-size: .7rem; font-weight: 700; white-space: nowrap;
    }
  `],
})
export class ReviewsOverview {
  readonly summary = input.required<CommentSummary>();
  readonly insights = input<CommentInsights | null>(null);
  readonly insightsLoading = input(false);
  /** El usuario quiere escribir una opinión (el padre abre el formulario o lleva al login). */
  readonly addReview = output<void>();

  readonly ratingsDesc: CommentRating[] = [5, 4, 3, 2, 1];

  readonly ready = computed(() => {
    const insights = this.insights();
    return insights?.status === 'ready' ? insights : null;
  });
  readonly averageText = computed(() => {
    const average = this.summary().average;
    return average === null ? '—' : average.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  });
  readonly pendingText = computed(() => {
    const insights = this.insights();
    if (insights?.status === 'insufficient') {
      const missing = insights.minComments - insights.commentCount;
      return `Faltan ${missing} ${missing === 1 ? 'opinión' : 'opiniones'} para el análisis IA`;
    }
    return 'Análisis IA no disponible ahora';
  });

  percentage(star: CommentRating): number {
    const { count, distribution } = this.summary();
    return count ? Math.round((distribution[star] / count) * 100) : 0;
  }
}
