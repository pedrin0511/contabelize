-- EXTENSÃO PARA UUID
create extension if not exists "uuid-ossp";

-- =========================
-- 🏢 TABELA: OFFICES (CLÍNICAS)
-- =========================
create table offices (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique not null,
  password_hash text not null,
  created_at timestamp default now()
);

-- =========================
-- 🔐 TABELA: SESSIONS (REFRESH TOKENS)
-- =========================
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  office_id uuid references offices(id) on delete cascade,
  refresh_token text not null,
  user_agent text,
  ip_address text,
  expires_at timestamp not null,
  revoked boolean default false,
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
  telefone text,
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
  reference_month date,
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
create index idx_sessions_user on sessions(user_id);
create index idx_sessions_token on sessions(refresh_token);
create index idx_sessions_expires on sessions(expires_at);

-- =========================
-- 🔒 ROW LEVEL SECURITY (RLS)
-- =========================
alter table offices enable row level security;
alter table clients enable row level security;
alter table services enable row level security;
alter table payments enable row level security;
alter table sessions enable row level security;

create policy "Allow all for now" on offices for all using (true);
create policy "Allow all for now" on clients for all using (true);
create policy "Allow all for now" on services for all using (true);
create policy "Allow all for now" on payments for all using (true);
create policy "Allow all for now" on sessions for all using (true);
