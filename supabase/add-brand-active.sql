-- Cole no SQL Editor do Supabase e clique Run
-- Arquivamento de marcas: active = false esconde a marca dos seletores de
-- novos registros, sem apagar nada. Políticas de RLS não mudam.
ALTER TABLE brands ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
