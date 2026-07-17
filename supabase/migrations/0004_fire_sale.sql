-- Fire Sale: a manager auctions one of their rostered players for auction-
-- budget cash. Phase 1a covers private (sealed-bid) sales. A resolved sale
-- becomes a trade (player -> winner, cash -> seller) in the commissioner
-- approval queue.

create type fire_sale_mode as enum ('private', 'public');
create type fire_sale_status as enum ('active', 'accepted', 'rejected', 'cancelled');

create table fire_sales (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id),
  seller_id uuid not null references managers(id),
  player_id text not null,
  player_name text not null,
  mode fire_sale_mode not null default 'private',
  min_bid integer not null default 1,
  deadline timestamptz not null,
  status fire_sale_status not null default 'active',
  winner_id uuid references managers(id),
  trade_id uuid references trades(id),
  created_at timestamptz not null default now()
);

create table fire_sale_bids (
  id uuid primary key default gen_random_uuid(),
  fire_sale_id uuid not null references fire_sales(id) on delete cascade,
  bidder_id uuid not null references managers(id),
  amount integer not null,
  created_at timestamptz not null default now(),
  unique (fire_sale_id, bidder_id)
);

create index fire_sales_season_idx on fire_sales (season_id);
create index fire_sale_bids_sale_idx on fire_sale_bids (fire_sale_id);

alter table fire_sales enable row level security;
alter table fire_sale_bids enable row level security;

create policy "authenticated read" on fire_sales for select to authenticated using (true);

-- Bids are SEALED. No client-readable select policy: all bid reads go through
-- server routes (service key) that enforce visibility — a bidder sees only
-- their own bid; the seller sees every bid only after the deadline passes.
