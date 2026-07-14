-- ============================================================
-- Adiciona controle de propriedade (created_by) nos registros
-- Cole no SQL Editor do Supabase e execute
-- ============================================================

-- 1. Adicionar coluna created_by
ALTER TABLE visits       ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE positivations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE followups    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Índices para consultas de ownership
CREATE INDEX IF NOT EXISTS idx_visits_created_by       ON visits(created_by);
CREATE INDEX IF NOT EXISTS idx_positivations_created_by ON positivations(created_by);
CREATE INDEX IF NOT EXISTS idx_followups_created_by    ON followups(created_by);

-- 3. Backfill: atribuir registros existentes ao único admin atual
--    (o usuário que não tem vínculo em brand_users)
UPDATE visits SET created_by = (
  SELECT id FROM auth.users
  WHERE id NOT IN (SELECT user_id FROM brand_users)
  ORDER BY created_at LIMIT 1
) WHERE created_by IS NULL;

UPDATE positivations SET created_by = (
  SELECT id FROM auth.users
  WHERE id NOT IN (SELECT user_id FROM brand_users)
  ORDER BY created_at LIMIT 1
) WHERE created_by IS NULL;

UPDATE followups SET created_by = (
  SELECT id FROM auth.users
  WHERE id NOT IN (SELECT user_id FROM brand_users)
  ORDER BY created_at LIMIT 1
) WHERE created_by IS NULL;

-- 4. Recriar políticas admin com restrição de propriedade para UPDATE/DELETE

-- VISITS
DROP POLICY IF EXISTS "admin_all_visits" ON visits;
CREATE POLICY "admin_select_visits" ON visits
  FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "admin_insert_visits" ON visits
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_update_visits" ON visits
  FOR UPDATE TO authenticated
  USING (is_admin() AND created_by = auth.uid())
  WITH CHECK (is_admin() AND created_by = auth.uid());
CREATE POLICY "admin_delete_visits" ON visits
  FOR DELETE TO authenticated
  USING (is_admin() AND created_by = auth.uid());

-- POSITIVATIONS
DROP POLICY IF EXISTS "admin_all_positivations" ON positivations;
CREATE POLICY "admin_select_positivations" ON positivations
  FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "admin_insert_positivations" ON positivations
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_update_positivations" ON positivations
  FOR UPDATE TO authenticated
  USING (is_admin() AND created_by = auth.uid())
  WITH CHECK (is_admin() AND created_by = auth.uid());
CREATE POLICY "admin_delete_positivations" ON positivations
  FOR DELETE TO authenticated
  USING (is_admin() AND created_by = auth.uid());

-- FOLLOWUPS
DROP POLICY IF EXISTS "admin_all_followups" ON followups;
CREATE POLICY "admin_select_followups" ON followups
  FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "admin_insert_followups" ON followups
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_update_followups" ON followups
  FOR UPDATE TO authenticated
  USING (is_admin() AND created_by = auth.uid())
  WITH CHECK (is_admin() AND created_by = auth.uid());
CREATE POLICY "admin_delete_followups" ON followups
  FOR DELETE TO authenticated
  USING (is_admin() AND created_by = auth.uid());
