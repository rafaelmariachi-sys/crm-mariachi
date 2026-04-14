-- ============================================================
-- Mariachi Spirits CRM — Schema + RLS Policies
-- Cole este arquivo inteiro no SQL Editor do Supabase
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- TABELAS
-- =====================

CREATE TABLE IF NOT EXISTS brands (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  logo_url   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venues (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  address      TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  city         TEXT NOT NULL,
  type         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visits (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id   UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  visited_at DATE NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS positivations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id     UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  brand_id     UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'positivado'
               CHECK (status IN ('positivado', 'em_negociacao', 'recusado', 'retorno_pendente')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS followups (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id   UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  brand_id   UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  due_date   DATE,
  status     TEXT NOT NULL DEFAULT 'aberto'
             CHECK (status IN ('aberto', 'concluido', 'cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brand_users (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  UNIQUE(user_id, brand_id)
);

-- =====================
-- ÍNDICES
-- =====================

CREATE INDEX IF NOT EXISTS idx_visits_venue_id ON visits(venue_id);
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at);
CREATE INDEX IF NOT EXISTS idx_positivations_visit_id ON positivations(visit_id);
CREATE INDEX IF NOT EXISTS idx_positivations_brand_id ON positivations(brand_id);
CREATE INDEX IF NOT EXISTS idx_followups_visit_id ON followups(visit_id);
CREATE INDEX IF NOT EXISTS idx_followups_brand_id ON followups(brand_id);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
CREATE INDEX IF NOT EXISTS idx_brand_users_user_id ON brand_users(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_users_brand_id ON brand_users(brand_id);

-- =====================
-- FUNÇÕES AUXILIARES PARA RLS
-- =====================

-- Retorna TRUE se o usuário atual é admin (sem vínculo em brand_users)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM brand_users WHERE user_id = auth.uid()
  );
END;
$$;

-- Retorna o brand_id do usuário atual (NULL se admin)
CREATE OR REPLACE FUNCTION get_user_brand_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT brand_id FROM brand_users WHERE user_id = auth.uid() LIMIT 1
  );
END;
$$;

-- =====================
-- ROW LEVEL SECURITY
-- =====================

-- BRANDS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_brands" ON brands
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "brand_user_own_brand" ON brands
  FOR SELECT TO authenticated
  USING (id = get_user_brand_id());

-- VENUES
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_venues" ON venues
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "brand_user_sees_venues" ON venues
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM visits v
      JOIN positivations p ON p.visit_id = v.id
      WHERE v.venue_id = venues.id AND p.brand_id = get_user_brand_id()
    )
    OR
    EXISTS (
      SELECT 1 FROM visits v
      JOIN followups f ON f.visit_id = v.id
      WHERE v.venue_id = venues.id AND f.brand_id = get_user_brand_id()
    )
  );

-- VISITS
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_visits" ON visits
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "brand_user_sees_visits" ON visits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM positivations p
      WHERE p.visit_id = visits.id AND p.brand_id = get_user_brand_id()
    )
    OR
    EXISTS (
      SELECT 1 FROM followups f
      WHERE f.visit_id = visits.id AND f.brand_id = get_user_brand_id()
    )
  );

-- POSITIVATIONS
ALTER TABLE positivations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_positivations" ON positivations
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "brand_user_own_positivations" ON positivations
  FOR SELECT TO authenticated
  USING (brand_id = get_user_brand_id());

-- FOLLOWUPS
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_followups" ON followups
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "brand_user_own_followups" ON followups
  FOR SELECT TO authenticated
  USING (brand_id = get_user_brand_id());

-- BRAND_USERS
ALTER TABLE brand_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_brand_users" ON brand_users
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "brand_user_own_record" ON brand_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
