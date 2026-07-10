-- Dynasty League schema — see spec section 3.
--
-- RLS strategy: every table is readable by any authenticated manager (the
-- spec calls for league-wide read-only visibility). Nothing is writable
-- directly from the client — all mutations (cash entry, keeper submission,
-- commissioner approval) go through server route handlers that authenticate
-- the caller via their session, resolve their `managers` row by email, and
-- use the admin (secret-key) client to perform the write after checking
-- ownership/role in application code. This keeps the approval state machine
-- in one place instead of duplicated across SQL policies.

create extension if not exists "pgcrypto";

create type manager_role as enum ('manager', 'commissioner');
create type season_status as enum ('active', 'closed');
create type draft_source as enum ('auction', 'waiver', 'keeper');
create type trade_status as enum ('pending_cash', 'pending_approval', 'approved', 'rejected');
create type keeper_price_rule as enum ('standard_plus_3', 'waiver_first_year', 'drafted_and_dropped');
create type keeper_status as enum ('submitted', 'approved', 'rejected');
create type ledger_reason as enum ('trade', 'keeper', 'starting_budget', 'other');

create table managers (
  id uuid primary key default gen_random_uuid(),
  sleeper_user_id text not null unique,
  sleeper_roster_id integer not null unique,
  display_name text not null,
  email text not null unique,
  role manager_role not null default 'manager',
  created_at timestamptz not null default now()
);

create table seasons (
  id uuid primary key default gen_random_uuid(),
  year integer not null unique,
  starting_budget integer not null default 200,
  status season_status not null default 'active',
  created_at timestamptz not null default now()
);

create table draft_records (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id),
  manager_id uuid not null references managers(id),
  player_id text not null,
  player_name text not null,
  price integer not null,
  source draft_source not null,
  created_at timestamptz not null default now(),
  unique (season_id, manager_id, player_id)
);

create table trades (
  id uuid primary key default gen_random_uuid(),
  sleeper_transaction_id text unique, -- null for pre-2026 trades with no Sleeper record
  season_id uuid not null references seasons(id),
  status trade_status not null default 'pending_cash',
  rejection_reason text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table trade_sides (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete cascade,
  manager_id uuid not null references managers(id),
  players_received text[] not null default '{}',
  cash_amount integer,
  created_at timestamptz not null default now(),
  unique (trade_id, manager_id)
);

create table keepers (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id),
  manager_id uuid not null references managers(id),
  player_id text not null,
  player_name text not null,
  previous_price integer,
  new_price integer not null,
  price_rule keeper_price_rule not null,
  status keeper_status not null default 'submitted',
  rejection_reason text,
  created_at timestamptz not null default now(),
  unique (season_id, manager_id, player_id)
);

create table budget_ledger (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id),
  manager_id uuid not null references managers(id),
  amount integer not null,
  reason ledger_reason not null,
  source_id uuid, -- fk to trades.id or keepers.id depending on `reason`; no
                   -- single referenced table, so left unconstrained.
  created_at timestamptz not null default now()
);

create index draft_records_season_manager_idx on draft_records (season_id, manager_id);
create index trade_sides_trade_idx on trade_sides (trade_id);
create index keepers_season_manager_idx on keepers (season_id, manager_id);
create index budget_ledger_season_manager_idx on budget_ledger (season_id, manager_id);

-- RLS: read-only for authenticated users, no client-side writes.
alter table managers enable row level security;
alter table seasons enable row level security;
alter table draft_records enable row level security;
alter table trades enable row level security;
alter table trade_sides enable row level security;
alter table keepers enable row level security;
alter table budget_ledger enable row level security;

create policy "authenticated read" on managers for select to authenticated using (true);
create policy "authenticated read" on seasons for select to authenticated using (true);
create policy "authenticated read" on draft_records for select to authenticated using (true);
create policy "authenticated read" on trades for select to authenticated using (true);
create policy "authenticated read" on trade_sides for select to authenticated using (true);
create policy "authenticated read" on keepers for select to authenticated using (true);
create policy "authenticated read" on budget_ledger for select to authenticated using (true);
