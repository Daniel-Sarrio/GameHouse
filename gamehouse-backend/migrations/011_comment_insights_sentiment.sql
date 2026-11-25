-- Análisis para el panel de administración: puntos positivos y negativos que repiten los usuarios y la balanza
-- de sentimiento (comentarios positivos, neutros y negativos). Se generan en la misma llamada al agente IA.
ALTER TABLE comment_insights
  ADD COLUMN IF NOT EXISTS positives JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS negatives JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS sentiment_positive INTEGER NOT NULL DEFAULT 0 CHECK (sentiment_positive >= 0),
  ADD COLUMN IF NOT EXISTS sentiment_neutral INTEGER NOT NULL DEFAULT 0 CHECK (sentiment_neutral >= 0),
  ADD COLUMN IF NOT EXISTS sentiment_negative INTEGER NOT NULL DEFAULT 0 CHECK (sentiment_negative >= 0);
