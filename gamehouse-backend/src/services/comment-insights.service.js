const repo = require('../repos/comment-insights.repo');
const commentsRepo = require('../repos/comments.repo');
const shopRepo = require('../repos/shop.repo');
const agent = require('./utils/agent-client');
const AppError = require('./utils/app-error');

// Con pocas opiniones el análisis no es representativo.
const MIN_COMMENTS = 3;
const MAX_ANALYZED = 100;

// Lista cerrada compartida con el agente: claves desconocidas se descartan.
const ASPECT_LABELS = {
  organizacion: 'Organización',
  ambiente: 'Ambiente',
  instalaciones: 'Instalaciones',
  equipamiento: 'Equipamiento',
  personal: 'Personal',
  calidad_precio: 'Calidad-precio',
  diversion: 'Diversión',
  ubicacion: 'Ubicación',
};

// Una sola generación en curso por experiencia, aunque lleguen varias visitas a la vez.
const inFlight = new Map();
// Tras un fallo del agente no se reintenta durante un tiempo: cada visita no debe esperar a un agente caído.
const RETRY_AFTER_MS = 5 * 60 * 1000;
const failedAt = new Map();

/** Revalida lo que devuelve el agente antes de guardarlo: nunca se confía en su salida. */
const sanitize = (result, comments) => {
  const analyzedCount = comments.length;
  // Un recuento imposible no se recorta (daría un falso 100 %): se calcula con las valoraciones de 4 o 5 estrellas.
  const recommendCount = Number.isInteger(result?.recommendCount) && result.recommendCount >= 0 && result.recommendCount <= analyzedCount
    ? result.recommendCount : comments.filter((comment) => comment.rating >= 4).length;
  const seen = new Set();
  const aspects = (Array.isArray(result?.aspects) ? result.aspects : [])
    .filter((aspect) => Object.hasOwn(ASPECT_LABELS, aspect?.key) && Number.isFinite(aspect.rating) && !seen.has(aspect.key) && seen.add(aspect.key))
    .slice(0, 6)
    .map((aspect) => ({
      key: aspect.key,
      rating: Math.min(5, Math.max(1, Math.round(aspect.rating * 2) / 2)),
      mentions: Number.isInteger(aspect.mentions) ? Math.min(Math.max(aspect.mentions, 1), analyzedCount) : 1,
    }));
  const summary = typeof result?.summary === 'string' ? result.summary.trim().slice(0, 280) : '';
  const points = (list) => [...new Set((Array.isArray(list) ? list : [])
    .filter((item) => typeof item === 'string').map((item) => item.trim().slice(0, 100)).filter(Boolean))].slice(0, 5);
  // La balanza debe sumar exactamente los comentarios analizados; si no, se deduce de las valoraciones.
  const counts = ['positive', 'neutral', 'negative'].map((key) => result?.sentiment?.[key]);
  const validSentiment = counts.every((value) => Number.isInteger(value) && value >= 0)
    && counts.reduce((total, value) => total + value, 0) === analyzedCount;
  const sentiment = validSentiment
    ? { positive: counts[0], neutral: counts[1], negative: counts[2] }
    : {
      positive: comments.filter((comment) => comment.rating >= 4).length,
      neutral: comments.filter((comment) => comment.rating === 3).length,
      negative: comments.filter((comment) => comment.rating <= 2).length,
    };
  return { analyzedCount, recommendCount, aspects, summary, positives: points(result?.positives), negatives: points(result?.negatives), sentiment };
};

const generate = async (experience, signature) => {
  const comments = await repo.findForAnalysis(experience.id, MAX_ANALYZED);
  const result = await agent.analyzeComments({
    experience: { name: experience.name, categories: experience.categories.map((category) => category.name) },
    comments,
  });
  return repo.upsert(experience.id, { signature, ...sanitize(result, comments) });
};

/** Lanza la generación (una sola por experiencia y conjunto de comentarios) y registra sus fallos. */
const generateOnce = (experience, signature) => {
  const key = `${experience.id}:${signature}`;
  if (!inFlight.has(key)) {
    const task = generate(experience, signature)
      .then((row) => { failedAt.delete(experience.id); return row; })
      .catch((error) => {
        failedAt.set(experience.id, Date.now());
        console.error('Comment insights failed:', { status: error.statusCode, experienceId: experience.id });
        throw error;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, task);
  }
  return inFlight.get(key);
};

const toResponse = (row, { stale, refreshing = false }) => ({
  status: 'ready',
  stale,
  // true mientras el agente prepara un análisis más reciente: el cliente puede volver a consultar.
  refreshing,
  analyzedCount: row.analyzed_count,
  recommendCount: row.recommend_count,
  recommendPercent: Math.round((row.recommend_count / row.analyzed_count) * 100),
  aspects: row.aspects.map((aspect) => ({ ...aspect, label: ASPECT_LABELS[aspect.key] })),
  summary: row.summary,
  generatedAt: row.generated_at,
});

/**
 * Análisis de las opiniones de una experiencia publicada. Nunca espera al modelo (puede tardar más que
 * cualquier timeout HTTP): si los comentarios han cambiado, lanza la generación en segundo plano y responde
 * al momento con el último análisis (`refreshing`) o con `pending`; el cliente vuelve a consultar.
 * Si el agente ha fallado hace poco, no se reintenta y se devuelve el último análisis (stale) o `unavailable`.
 */
const getInsights = async (slug) => {
  const experience = await shopRepo.findExperienceBySlug(slug);
  if (!experience) throw new AppError('Experiencia no encontrada.', 404);
  const { count } = await commentsRepo.summarize(experience.id);
  if (count < MIN_COMMENTS) return { status: 'insufficient', minComments: MIN_COMMENTS, commentCount: count };

  const [signature, cached] = await Promise.all([repo.signature(experience.id), repo.findByExperience(experience.id)]);
  if (cached && cached.signature === signature) return toResponse(cached, { stale: false });
  if (Date.now() - (failedAt.get(experience.id) ?? 0) < RETRY_AFTER_MS) {
    return cached ? toResponse(cached, { stale: true }) : { status: 'unavailable' };
  }
  generateOnce(experience, signature).catch(() => undefined);
  return cached ? toResponse(cached, { stale: true, refreshing: true }) : { status: 'pending' };
};

/** Tras publicar o borrar un comentario, regenera el análisis en segundo plano para la próxima visita. */
const refreshInBackground = (slug) => {
  getInsights(slug).catch(() => undefined);
};

const isGenerating = (experienceId) => [...inFlight.keys()].some((key) => key.startsWith(`${experienceId}:`));

/** Análisis completo para el panel de administración, con lo positivo, lo negativo y la balanza de sentimiento. */
const toAdminResponse = (row, { fresh }) => {
  const { positive, neutral, negative } = {
    positive: row.sentiment_positive, neutral: row.sentiment_neutral, negative: row.sentiment_negative,
  };
  const total = positive + neutral + negative;
  return {
    ...toResponse(row, { stale: !fresh }),
    positives: row.positives,
    negatives: row.negatives,
    sentiment: {
      positive,
      neutral,
      negative,
      // De -1 (todo negativo) a 1 (todo positivo): la posición de la balanza.
      score: total ? Math.round(((positive - negative) / total) * 100) / 100 : 0,
    },
  };
};

/**
 * Estado del análisis de una experiencia para el administrador (`experience` ya validada, publicada o no):
 * none (nunca analizada), ready (fresh si incluye todos los comentarios actuales), y si se está generando.
 */
const getAdminAnalysis = async (experience) => {
  const [{ count }, signature, cached] = await Promise.all([
    commentsRepo.summarize(experience.id), repo.signature(experience.id), repo.findByExperience(experience.id),
  ]);
  const lastFailure = failedAt.get(experience.id);
  return {
    commentCount: count,
    generating: isGenerating(experience.id),
    lastFailedAt: lastFailure ? new Date(lastFailure).toISOString() : null,
    analysis: cached ? toAdminResponse(cached, { fresh: cached.signature === signature }) : null,
  };
};

/**
 * El administrador pide analizar las opiniones ahora: se lanza en segundo plano aunque el análisis esté al día
 * y sin esperar la pausa tras un fallo. Basta con una opinión. El cliente consulta getAdminAnalysis hasta que termine.
 */
const analyzeNow = async (experience) => {
  const { count } = await commentsRepo.summarize(experience.id);
  if (!count) throw new AppError('Esta experiencia todavía no tiene opiniones que analizar.', 409);
  failedAt.delete(experience.id);
  // generateOnce siempre genera (aunque el análisis esté al día) y une las peticiones simultáneas.
  if (!isGenerating(experience.id)) generateOnce(experience, await repo.signature(experience.id)).catch(() => undefined);
  return getAdminAnalysis(experience);
};

/** Solo para pruebas: espera a que terminen las generaciones en curso. */
const settle = () => Promise.allSettled([...inFlight.values()]);

/** Solo para pruebas: olvida los fallos recientes del agente. */
const resetFailures = () => failedAt.clear();

module.exports = {
  getInsights, getAdminAnalysis, analyzeNow, resetFailures, settle, refreshInBackground, sanitize, MIN_COMMENTS, ASPECT_LABELS,
};
