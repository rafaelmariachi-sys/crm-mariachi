-- ============================================================
-- Mariachi Spirits CRM — Seed de dados para teste
-- ATENÇÃO: Execute SOMENTE em ambiente de desenvolvimento
-- ============================================================

-- 1. MARCAS
INSERT INTO brands (id, name) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Diageo Brasil'),
  ('11111111-0000-0000-0000-000000000002', 'Campari Group'),
  ('11111111-0000-0000-0000-000000000003', 'Patrón Spirits')
ON CONFLICT (id) DO NOTHING;

-- 2. CASAS
INSERT INTO venues (id, name, address, neighborhood, city, type) VALUES
  ('22222222-0000-0000-0000-000000000001', 'Bar do Alemão', 'Rua Augusta, 1500', 'Consolação', 'São Paulo', 'Bar'),
  ('22222222-0000-0000-0000-000000000002', 'Restaurante Nonna Maria', 'Al. Santos, 800', 'Jardins', 'São Paulo', 'Restaurante'),
  ('22222222-0000-0000-0000-000000000003', 'Rooftop Sky Lounge', 'Av. Paulista, 2200', 'Bela Vista', 'São Paulo', 'Rooftop'),
  ('22222222-0000-0000-0000-000000000004', 'Club Privilege', 'Rua Bela Cintra, 900', 'Cerqueira César', 'São Paulo', 'Balada'),
  ('22222222-0000-0000-0000-000000000005', 'Hotel Grand Hyatt', 'Av. das Nações Unidas, 13301', 'Brooklin', 'São Paulo', 'Hotel'),
  ('22222222-0000-0000-0000-000000000006', 'Empório Santa Cruz', 'Rua Santa Cruz, 350', 'Vila Mariana', 'São Paulo', 'Empório'),
  ('22222222-0000-0000-0000-000000000007', 'Bar Astor', 'Rua Delfina, 163', 'Vila Madalena', 'São Paulo', 'Bar'),
  ('22222222-0000-0000-0000-000000000008', 'Restaurante Fogo de Chão', 'Al. Santos, 1241', 'Cerqueira César', 'São Paulo', 'Restaurante')
ON CONFLICT (id) DO NOTHING;

-- 3. VISITAS (últimos 2 meses)
INSERT INTO visits (id, venue_id, visited_at, notes) VALUES
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', CURRENT_DATE - 2,  'Gerente receptivo. Bom potencial para Johnnie Walker.'),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', CURRENT_DATE - 5,  'Conversei com o sommelier. Interesse em gin artesanal.'),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003', CURRENT_DATE - 8,  'Apresentação completa do portfólio. Fizeram pedido inicial.'),
  ('33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000004', CURRENT_DATE - 12, 'Negociação de contrato de exclusividade em andamento.'),
  ('33333333-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000005', CURRENT_DATE - 15, 'Reunião com F&B manager. Alto potencial.'),
  ('33333333-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000006', CURRENT_DATE - 20, 'Pedido já realizado. Acompanhamento pós-venda.'),
  ('33333333-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000007', CURRENT_DATE - 25, 'Casa muito movimentada. Gerente pediu retorno na próxima semana.'),
  ('33333333-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000008', CURRENT_DATE - 30, 'Visita de reconhecimento. Levantamento de marcas atuais.')
ON CONFLICT (id) DO NOTHING;

-- 4. POSITIVAÇÕES
INSERT INTO positivations (visit_id, brand_id, product_name, status, notes) VALUES
  -- Bar do Alemão
  ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Johnnie Walker Red Label', 'positivado', 'Entrará no cardápio semana que vem.'),
  ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Johnnie Walker Black Label', 'em_negociacao', 'Gerente avaliando o preço.'),
  -- Restaurante Nonna Maria
  ('33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'Tanqueray London Dry', 'positivado', 'Pedido de 6 caixas confirmado.'),
  ('33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'Negroni Campari', 'em_negociacao', NULL),
  -- Rooftop Sky Lounge
  ('33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Johnnie Walker Gold', 'positivado', NULL),
  ('33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'Patrón Silver', 'positivado', 'Primeiro pedido de tequila da casa.'),
  ('33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'Patrón Reposado', 'retorno_pendente', 'Aguardando aprovação do gerente geral.'),
  -- Club Privilege
  ('33333333-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002', 'Campari', 'positivado', 'Cocktail menu atualizado.'),
  ('33333333-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002', 'Aperol', 'positivado', NULL),
  -- Hotel Grand Hyatt
  ('33333333-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', 'Johnnie Walker Blue Label', 'em_negociacao', 'Reunião com diretoria na semana que vem.'),
  ('33333333-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000003', 'Patrón Añejo', 'retorno_pendente', NULL),
  -- Empório Santa Cruz
  ('33333333-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', 'Tanqueray Sevilla', 'positivado', NULL),
  -- Bar Astor
  ('33333333-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000002', 'Aperol Spritz Kit', 'recusado', 'Casa já trabalha com marca concorrente.'),
  ('33333333-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000001', 'Johnnie Walker Double Black', 'em_negociacao', NULL),
  -- Restaurante Fogo de Chão
  ('33333333-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000003', 'Patrón Silver', 'retorno_pendente', 'Interesse confirmado, aguardando tabela de preços.')
ON CONFLICT DO NOTHING;

-- 5. FOLLOW-UPS
INSERT INTO followups (visit_id, brand_id, content, due_date, status) VALUES
  ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'Enviar proposta comercial para Johnnie Walker Black Label', CURRENT_DATE + 3, 'aberto'),
  ('33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002',
   'Retornar com material de apresentação do Negroni', CURRENT_DATE + 7, 'aberto'),
  ('33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003',
   'Aguardar aprovação do Patrón Reposado pelo gerente geral', CURRENT_DATE + 5, 'aberto'),
  ('33333333-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002',
   'Confirmar entrega das primeiras caixas de Campari', CURRENT_DATE - 2, 'concluido'),
  ('33333333-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001',
   'Reunião com diretoria do hotel para fechar JW Blue Label', CURRENT_DATE + 1, 'aberto'),
  ('33333333-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000003',
   'Enviar tabela de preços Patrón Añejo', CURRENT_DATE - 1, 'aberto'),
  ('33333333-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000001',
   'Retorno sobre Double Black após avaliação do gerente', CURRENT_DATE + 10, 'aberto'),
  ('33333333-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000003',
   'Enviar tabela de preços Patrón Silver ao Fogo de Chão', CURRENT_DATE + 2, 'aberto')
ON CONFLICT DO NOTHING;

-- ============================================================
-- INSTRUÇÕES PARA CRIAR USUÁRIOS DE TESTE:
--
-- 1. ADMIN: Crie via Supabase Dashboard > Authentication > Users
--    Email: admin@mariachisp.com.br
--    Senha: admin123
--    (Não adicione na tabela brand_users — isso o torna admin)
--
-- 2. BRAND USERS: Use o painel admin (/admin/brands > "Criar acesso")
--    OU crie manualmente via Dashboard e depois insira em brand_users:
--
--    INSERT INTO brand_users (user_id, brand_id) VALUES
--      ('<UUID_DO_USUÁRIO>', '11111111-0000-0000-0000-000000000001');
--
-- ============================================================
