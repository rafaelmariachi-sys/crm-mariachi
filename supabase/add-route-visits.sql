-- Cole no SQL Editor do Supabase e clique Run
CREATE TABLE IF NOT EXISTS route_visits (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id    TEXT        UNIQUE NOT NULL,
  place_name  TEXT,
  address     TEXT,
  region_key  TEXT,
  visited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE route_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_route_visits" ON route_visits
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
