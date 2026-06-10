-- ============================================================
-- Prospecção HORECA — cole no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS prospects (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id            TEXT        UNIQUE NOT NULL,          -- ID Google Places (deduplicação)
  name                TEXT        NOT NULL,
  type                TEXT,
  address             TEXT,
  neighborhood        TEXT,
  city                TEXT,
  phone               TEXT,
  website             TEXT,
  instagram_google    TEXT,                                 -- IG detectado via campo site
  instagram_confirmed TEXT,                                 -- IG confirmado (fase 2)
  names_identified    TEXT,
  role_identified     TEXT,
  personal_handle     TEXT,
  rating              NUMERIC(3,1),
  review_count        INT,
  territory           TEXT,
  status              TEXT        NOT NULL DEFAULT 'novo'
    CHECK (status IN ('novo','contatado','visita_agendada','convertido','descartado')),
  notes               TEXT,
  extracted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospects_status      ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_city        ON prospects(city);
CREATE INDEX IF NOT EXISTS idx_prospects_type        ON prospects(type);
CREATE INDEX IF NOT EXISTS idx_prospects_extracted   ON prospects(extracted_at DESC);

-- RLS: somente admin acessa prospecção
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_prospects" ON prospects
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
