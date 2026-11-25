import { Component, computed, input } from '@angular/core';
import { SentimentBalance } from '../../../../core/models/review.model';

const MAX_TILT_DEG = 16;
const BEAM_HALF = 92;
const PIVOT = { x: 120, y: 40 };

/**
 * Balanza de positivo frente a negativo. El brazo se inclina hacia el platillo con más peso según el score
 * (de -1, todo negativo, a 1, todo positivo); debajo, el reparto de comentarios positivos, neutros y negativos.
 */
@Component({
  selector: 'app-sentiment-balance',
  template: `
    <figure class="m-0 flex flex-col gap-4">
      <svg viewBox="0 0 240 150" class="balanza" role="img" [attr.aria-label]="ariaLabel()">
        <!-- Pie y columna -->
        <path d="M84 142 h72 l-12 -14 h-48 z" class="estructura" />
        <rect x="116" y="42" width="8" height="88" rx="3" class="estructura" />
        <!-- Brazo inclinado -->
        <line [attr.x1]="left().x" [attr.y1]="left().y" [attr.x2]="right().x" [attr.y2]="right().y" class="brazo" />
        <circle [attr.cx]="pivot.x" [attr.cy]="pivot.y" r="7" class="estructura" />
        <!-- Platillo positivo (izquierda) -->
        <g [attr.transform]="'translate(' + left().x + ' ' + left().y + ')'">
          <line x1="0" y1="0" x2="-24" y2="40" class="cuerda" />
          <line x1="0" y1="0" x2="24" y2="40" class="cuerda" />
          <path d="M-30 40 h60 a30 13 0 0 1 -60 0 z" class="platillo positivo" />
          <text x="0" y="68" text-anchor="middle" class="etiqueta positivo-texto">{{ balance().positive }} +</text>
        </g>
        <!-- Platillo negativo (derecha) -->
        <g [attr.transform]="'translate(' + right().x + ' ' + right().y + ')'">
          <line x1="0" y1="0" x2="-24" y2="40" class="cuerda" />
          <line x1="0" y1="0" x2="24" y2="40" class="cuerda" />
          <path d="M-30 40 h60 a30 13 0 0 1 -60 0 z" class="platillo negativo" />
          <text x="0" y="68" text-anchor="middle" class="etiqueta negativo-texto">{{ balance().negative }} −</text>
        </g>
      </svg>

      <figcaption class="flex flex-col gap-2">
        <strong class="text-center text-base" [class]="verdictClass()">{{ verdict() }}</strong>
        <div class="barra" aria-hidden="true">
          @if (percent().positive) { <span class="positivo" [style.width.%]="percent().positive"></span> }
          @if (percent().neutral) { <span class="neutro" [style.width.%]="percent().neutral"></span> }
          @if (percent().negative) { <span class="negativo" [style.width.%]="percent().negative"></span> }
        </div>
        <ul class="m-0 flex list-none flex-wrap justify-between gap-2 p-0 text-xs text-slate-600">
          <li><span class="punto positivo"></span>Positivas {{ balance().positive }} ({{ percent().positive }}%)</li>
          <li><span class="punto neutro"></span>Neutras {{ balance().neutral }} ({{ percent().neutral }}%)</li>
          <li><span class="punto negativo"></span>Negativas {{ balance().negative }} ({{ percent().negative }}%)</li>
        </ul>
      </figcaption>
    </figure>
  `,
  styles: [`
    :host { display: block; }
    .balanza { width: 100%; max-width: 20rem; margin-inline: auto; overflow: visible; }
    .estructura { fill: var(--suave); }
    .brazo { stroke: var(--suave); stroke-width: 6; stroke-linecap: round; transition: all .6s ease; }
    .cuerda { stroke: var(--borde-fuerte); stroke-width: 1.5; }
    .platillo { stroke-width: 2; }
    .platillo.positivo { fill: color-mix(in srgb, #059669 22%, transparent); stroke: #059669; }
    .platillo.negativo { fill: color-mix(in srgb, #dc2626 22%, transparent); stroke: #dc2626; }
    .etiqueta { font-size: 13px; font-weight: 800; }
    .positivo-texto { fill: #059669; }
    .negativo-texto { fill: #dc2626; }
    g { transition: transform .6s ease; }
    .barra { display: flex; height: 10px; overflow: hidden; border-radius: 999px; background: var(--superficie-hundida); }
    .barra span { height: 100%; }
    .positivo { background: #059669; }
    .neutro { background: var(--borde-fuerte); }
    .negativo { background: #dc2626; }
    .punto { display: inline-block; width: .55rem; height: .55rem; margin-right: .35rem; border-radius: 999px; }
    .verde { color: #059669; }
    .rojo { color: #dc2626; }
    .gris { color: var(--texto-secundario); }
  `],
})
export class SentimentBalanceChart {
  readonly balance = input.required<SentimentBalance>();
  readonly pivot = PIVOT;

  /** Ángulo del brazo: el platillo con más peso baja. */
  private readonly angle = computed(() => (this.balance().score * MAX_TILT_DEG * Math.PI) / 180);
  readonly left = computed(() => ({
    x: PIVOT.x - BEAM_HALF * Math.cos(this.angle()),
    y: PIVOT.y + BEAM_HALF * Math.sin(this.angle()),
  }));
  readonly right = computed(() => ({
    x: PIVOT.x + BEAM_HALF * Math.cos(this.angle()),
    y: PIVOT.y - BEAM_HALF * Math.sin(this.angle()),
  }));

  readonly percent = computed(() => {
    const { positive, neutral, negative } = this.balance();
    const total = positive + neutral + negative;
    if (!total) return { positive: 0, neutral: 0, negative: 0 };
    const positivePct = Math.round((positive / total) * 100);
    const negativePct = Math.round((negative / total) * 100);
    return { positive: positivePct, negative: negativePct, neutral: Math.max(0, 100 - positivePct - negativePct) };
  });

  readonly verdict = computed(() => {
    const score = this.balance().score;
    if (score >= 0.6) return 'Muy positivo';
    if (score >= 0.2) return 'Mayormente positivo';
    if (score > -0.2) return 'Equilibrado';
    if (score > -0.6) return 'Mayormente negativo';
    return 'Muy negativo';
  });
  readonly verdictClass = computed(() => {
    const score = this.balance().score;
    return score >= 0.2 ? 'verde' : score <= -0.2 ? 'rojo' : 'gris';
  });
  readonly ariaLabel = computed(() => {
    const { positive, neutral, negative } = this.balance();
    return `Balanza: ${this.verdict()}. ${positive} positivas, ${neutral} neutras y ${negative} negativas.`;
  });
}
