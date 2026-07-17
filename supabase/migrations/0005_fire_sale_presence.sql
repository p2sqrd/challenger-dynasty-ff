-- Live-auction presence: tracks who's currently watching a public Fire Sale.
-- Refreshed each time a client polls the auction state; "watching now" = a
-- recent last_seen. Server-only (no client read policy).

create table fire_sale_presence (
  fire_sale_id uuid not null references fire_sales(id) on delete cascade,
  manager_id uuid not null references managers(id),
  last_seen timestamptz not null default now(),
  primary key (fire_sale_id, manager_id)
);

alter table fire_sale_presence enable row level security;
