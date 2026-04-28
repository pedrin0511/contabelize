ESTRUTURA DO BANCO DE DADOS:
    -- EXTENSÃO PARA UUID
create extension if not exists "uuid-ossp";

-- =========================
-- 🏢 TABELA: OFFICES
-- =========================
create table offices (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique,
  created_at timestamp default now()
);

-- =========================
-- 👤 TABELA: CLIENTS
-- =========================
create table clients (
  id uuid primary key default uuid_generate_v4(),
  office_id uuid references offices(id) on delete cascade,
  name text not null,
  document text,
  due_day int check (due_day >= 1 and due_day <= 31),
  created_at timestamp default now()
);

-- =========================
-- 📦 TABELA: SERVICES (CONTRATOS)
-- =========================
create table services (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  type text check (type in ('recurring', 'one_time')) not null,
  price numeric(10,2) not null,
  recurrence text check (recurrence in ('monthly', 'yearly')),
  start_date date not null,
  end_date date,
  created_at timestamp default now()
);

-- =========================
-- 💳 TABELA: PAYMENTS
-- =========================
create table payments (
  id uuid primary key default uuid_generate_v4(),
  service_id uuid references services(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  amount numeric(10,2) not null,
  due_date date not null,
  status text check (status in ('paid', 'pending', 'late')) default 'pending',
  paid_at timestamp,
  reference_month date, -- ex: 2026-04-01
  created_at timestamp default now()
);

create table sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  refresh_token text not null,
  user_agent text,
  ip_address text,
  expires_at timestamp not null,
  created_at timestamp default now()
);

-- =========================
-- ⚡ INDEXES (PERFORMANCE)
-- =========================
create index idx_clients_office on clients(office_id);
create index idx_services_client on services(client_id);
create index idx_payments_client on payments(client_id);
create index idx_payments_service on payments(service_id);
create index idx_payments_status on payments(status);

-- =========================
-- 🔒 ROW LEVEL SECURITY (RLS)
-- =========================

-- Ativar RLS
alter table offices enable row level security;
alter table clients enable row level security;
alter table services enable row level security;
alter table payments enable row level security;

-- ⚠️ IMPORTANTE:
-- Isso aqui é básico. Depois você pode ligar com auth do Supabase

-- Exemplo simples (liberar tudo por enquanto)
create policy "Allow all for now" on offices for all using (true);
create policy "Allow all for now" on clients for all using (true);
create policy "Allow all for now" on services for all using (true);
create policy "Allow all for now" on payments for all using (true);

-- =========================
-- 🔐 TABELA: SESSIONS (CORRIGIDA)
-- =========================
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  office_id uuid references offices(id) on delete cascade,
  refresh_token text not null unique,
  user_agent text,
  ip_address text,
  expires_at timestamp not null,
  revoked boolean default false,
  created_at timestamp default now()
);

-- Índices para sessions
create index idx_sessions_token on sessions(refresh_token);
create index idx_sessions_expires on sessions(expires_at);
create index idx_sessions_office on sessions(office_id);

-- =========================
-- 🔑 SISTEMA DE AUTENTICAÇÃO - DOCUMENTAÇÃO
-- =========================

## Visão Geral
O sistema utiliza **JWT (JSON Web Tokens)** com **Refresh Tokens** armazenados no banco de dados (Supabase). O frontend é construído com **Next.js 13+ (App Router)**.

## Conceitos Fundamentais

### JWT (JSON Web Token)
Um passe de acesso codificado com 3 partes:
- **Header**: tipo do token e algoritmo
- **Payload**: dados (officeId, email, expiração)
- **Signature**: assinatura com chave secreta (`JWT_SECRET`)

### Access Token vs Refresh Token
| Tipo | Função | Tempo de Vida | Onde fica |
|------|--------|---------------|-----------|
| **Access Token** | Prova que você está logado | 15 minutos | Cookie normal (acessível via JS) |
| **Refresh Token** | Gera novos access tokens | 7 dias | Cookie httpOnly (seguro, não acessível via JS) |

**Analogia**: O Access Token é como uma senha temporária de 15 min. O Refresh Token é como um cartão que dura 7 dias e permite gerar novas senhas temporárias.

## Estrutura do Banco de Dados

### Tabela `offices` (usuários/clínicas)
- `id`: uuid (identificador único)
- `name`: text (nome da clínica)
- `email`: text (email de login, único)
- `password_hash`: text (senha criptografada com bcrypt)
- `created_at`: timestamp

### Tabela `sessions` (controle de login)
- `id`: uuid
- `office_id`: uuid (qual clínica/logou)
- `refresh_token`: text (UUID v4 armazenado no cookie)
- `user_agent`: text (navegador usado)
- `ip_address`: text (IP do usuário)
- `expires_at`: timestamp (7 dias depois)
- `revoked`: boolean (se foi deslogado)
- `created_at`: timestamp

## Fluxos do Sistema

### 1. REGISTRO (`/api/auth/register`)
```
Usuário preenche: nome, email, senha
                    ↓
         POST /api/auth/register
                    ↓
    1. Verifica se email já existe na tabela offices
    2. Gera hash da senha: bcrypt.hash(password)
    3. Insere novo office no banco
    4. Cria sessão: generateRefreshToken() + createSession()
    5. Gera access token JWT (15 min)
    6. Define cookies: refresh_token e access_token
    7. Retorna dados do office + access token
```

### 2. LOGIN (`/api/auth/login`)
```
Usuário preenche: email, senha
                    ↓
         POST /api/auth/login
                    ↓
    1. Busca office pelo email na tabela offices
    2. Compara senha: bcrypt.compare(password, office.password_hash)
    3. Se senha correta:
       - Gera novo access token JWT
       - Cria nova sessão com refresh token
       - Define os cookies
    4. Se senha errada: retorna erro 401
```

### 3. PROTEÇÃO DE ROTAS (`proxy.ts` - Middleware)
```
Usuário tenta acessar /home/dashboard
                    ↓
        proxy.ts (middleware) executa
                    ↓
    1. Tenta ler cookie access_token
    2. Se access_token válido:
       - Decodifica JWT (verifyAccessToken)
       - Adiciona headers: x-office-id, x-office-email
       - PERMITE acesso
    3. Se access_token inválido/expirado:
       - Tenta ler cookie refresh_token
       - Se refresh_token válido no banco: PERMITE acesso
       - Se nada válido: REDIRECIONA para /login
```

**Configuração**: O matcher `['/home/:path*']` protege tudo sob `/home`.

### 4. REFRESH TOKEN (`/api/auth/refresh`)
Quando o access token de 15 minutos expira:
```
Frontend detecta erro 401 (token expirado)
                    ↓
         POST /api/auth/refresh
         (envia cookie refresh_token automaticamente)
                    ↓
    1. Lê refresh_token do cookie
    2. validateSession(refresh_token):
       - Busca sessão no banco
       - Verifica se não está revoked
       - Verifica se não expirou (expires_at)
    3. Se válida:
       - Busca dados do office
       - Gera NOVO access token (mais 15 min)
       - Retorna novo access token
    4. Se inválida: erro 401 (precisa fazer login novamente)
```

**Importante**: O refresh token NÃO é renovado aqui. Ele continua o mesmo até expirar (7 dias).

### 5. VERIFICAR USUÁRIO LOGADO (`/api/auth/me`)
```
GET /api/auth/me
Header: Authorization: Bearer <access_token>
                    ↓
    1. Extrai token do header
    2. Verifica JWT: verifyAccessToken(token)
    3. Se válido:
       - Pega officeId do payload
       - Busca dados do office no banco
       - Retorna: { id, name, email }
    4. Se inválido: erro 401
```

### 6. LOGOUT (`/api/auth/logout`)
```
Usuário clica em "Sair"
                    ↓
         POST /api/auth/logout
                    ↓
    1. Lê refresh_token do cookie
    2. deleteSession(refresh_token):
       - Remove sessão da tabela sessions no banco
    3. Remove cookies: refresh_token e access_token
    4. Redireciona para /login
```

## Fluxo Completo Visual
```
REGISTRO/LOGIN
     ↓
Access Token (15 min) + Refresh Token (7 dias) salvos em cookies
     ↓
Usuário acessa /home
     ↓
Middleware valida Access Token
     ↓
Se válido → Acesso liberado
Se expirado → Usa Refresh Token para gerar novo Access Token
Se refresh inválido → Redireciona para /login
     ↓
LOGOUT → Deleta sessão do banco + limpa cookies
```

## Arquivos Principais

| Arquivo | Função |
|---------|--------|
| `lib/auth.ts` | JWT, hash de senha, geração de tokens |
| `lib/session.ts` | CRUD de sessões no banco |
| `lib/supabase.ts` | Cliente do banco de dados |
| `proxy.ts` | Middleware (protege rotas) |
| `app/api/auth/register/route.ts` | Endpoint de registro |
| `app/api/auth/login/route.ts` | Endpoint de login |
| `app/api/auth/logout/route.ts` | Endpoint de logout |
| `app/api/auth/refresh/route.ts` | Endpoint de refresh token |
| `app/api/auth/me/route.ts` | Endpoint de dados do usuário |

## Segurança e Detalhes Técnicos

### Por que dois tokens?
- **Access Token curto (15 min)**: Se for roubado, serve pouco tempo
- **Refresh Token longo (7 dias)**: Fica em cookie httpOnly (JS não acessa), mais seguro
- **Revogação**: Como sessões ficam no banco, você pode deslogar remotamente

### Cookies explicados
| Cookie | httpOnly | Segurança | Acessível via JS |
|--------|----------|-----------|------------------|
| refresh_token | ✅ Sim | Alto | ❌ Não |
| access_token | ❌ Não | Médio | ✅ Sim |

## ⚠️ Pontos de Atenção

1. **`SUPABASE_SERVICE_KEY`** no `.env` deve ser diferente da chave pública
2. **RLS no Supabase** está "allow all" - inseguro para produção
3. **Sem rate limiting** - recomenda-se implementar para evitar brute force
4. O schema SQL original tinha erro no índice (`user_id` → `office_id`) - já corrigido acima