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
  return { analyzedCount, recommendCount, aspects, summary };
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

/** Solo para pruebas: espera a que terminen las generaciones en curso. */
const settle = () => Promise.allSettled([...inFlight.values()]);

/** Solo para pruebas: olvida los fallos recientes del agente. */
const resetFailures = () => failedAt.clear();

module.exports = { getInsights, resetFailures, settle, refreshInBackground, sanitize, MIN_COMMENTS, ASPECT_LABELS };
