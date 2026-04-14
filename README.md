# Mariachi Spirits CRM

CRM completo para embaixador de marcas do setor de bebidas, construído com **Next.js 14**, **Supabase** e **Tailwind CSS**.

## Funcionalidades

- **Painel Admin**: CRUD de casas, registro de visitas com positivações e follow-ups, gestão de marcas e acessos
- **Painel Brand**: Visualização de visitas, positivações, follow-ups e relatórios com gráficos
- **Autenticação e controle de acesso**: RLS no Supabase garante isolamento total de dados por marca
- **Dark mode nativo**, mobile-first, feedback visual em todas as ações

## Stack

- Next.js 14 (App Router + Server Components)
- Supabase (PostgreSQL + Auth + RLS)
- Tailwind CSS + shadcn/ui
- Recharts (gráficos)
- Hospedagem: Vercel

---

## Setup

### 1. Clonar e instalar dependências

```bash
git clone <repo-url>
cd mariachi-spirits-crm
npm install
```

### 2. Configurar Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. No **SQL Editor**, cole e execute o conteúdo de `supabase/schema.sql`
3. Para dados de teste, execute também `supabase/seed.sql`

### 3. Variáveis de ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```bash
cp .env.example .env.local
```

Preencha as variáveis:

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role key |

> ⚠️ A `SUPABASE_SERVICE_ROLE_KEY` é usada apenas em rotas de servidor (API routes). **Nunca a exponha no frontend.**

### 4. Criar usuário admin

1. Acesse Supabase Dashboard → **Authentication** → **Users** → **Add user**
2. Email: `admin@mariachisp.com.br` (ou o de sua preferência)
3. Senha: escolha uma senha segura
4. **Não** crie registro em `brand_users` para este usuário — isso o identifica como admin automaticamente

### 5. Rodar localmente

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

### 6. Deploy na Vercel

1. Faça push do projeto para um repositório GitHub
2. Importe o repositório na [Vercel](https://vercel.com)
3. Adicione as variáveis de ambiente no painel da Vercel
4. Deploy automático

---

## Estrutura de rotas

| Rota | Acesso | Descrição |
|---|---|---|
| `/login` | Público | Login com detecção de perfil |
| `/admin/dashboard` | Admin | Métricas e visão geral |
| `/admin/venues` | Admin | Cadastro e gestão de casas |
| `/admin/visits` | Admin | Lista de visitas |
| `/admin/visits/new` | Admin | Registrar nova visita |
| `/admin/visits/[id]` | Admin | Detalhes de uma visita |
| `/admin/followups` | Admin | Gestão de follow-ups |
| `/admin/brands` | Admin | Gestão de marcas e acessos |
| `/brand/dashboard` | Brand User | Dashboard da marca |
| `/brand/visits` | Brand User | Histórico de visitas |
| `/brand/followups` | Brand User | Follow-ups da marca |
| `/brand/reports` | Brand User | Relatórios visuais |

---

## Perfis de usuário

### Admin (Mariachi)
- Acesso completo a todos os dados
- Cria/edita/exclui casas, visitas, positivações, follow-ups e marcas
- Cria usuários de acesso para cada marca

### Brand User (representante da marca)
- Visualização somente leitura
- Vê **apenas** dados relacionados à sua marca
- Isolamento garantido por RLS no banco de dados

---

## Dados de teste

Após executar o `seed.sql`, use os seguintes acessos:

**Admin:**
- Email: `admin@mariachisp.com.br`
- Senha: definida por você no Supabase Dashboard

**Brand User (Diageo):**
- Crie via `/admin/brands` → botão "Criar acesso" → Diageo Brasil
- Ou insira manualmente no Supabase seguindo as instruções no arquivo `seed.sql`

---

## Schema do banco

```
brands         — marcas clientes
venues         — estabelecimentos (bares, restaurantes, etc.)
visits         — visitas a estabelecimentos
positivations  — positivações de produtos por marca em cada visita
followups      — compromissos e retornos agendados
brand_users    — vínculo entre usuários Supabase e marcas
```

A segurança é garantida por **Row Level Security (RLS)** com duas funções auxiliares:
- `is_admin()` — retorna `true` se o usuário não está em `brand_users`
- `get_user_brand_id()` — retorna o `brand_id` do usuário atual
