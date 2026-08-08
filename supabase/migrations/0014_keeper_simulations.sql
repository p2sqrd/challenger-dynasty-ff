-- Saved keeper simulations: a manager's private what-if scenarios on the
-- Simulate Keepers page. `selections` maps each team's manager_id to the list
-- of player_ids kept in that scenario. Purely a personal sandbox — a sim only
-- ever holds the owner's own real keepers plus their guesses for other teams,
-- so it's owner-private and never reveals anyone's actual submitted picks.

create table keeper_simulations (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references managers(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  name text not null,
  selections jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index keeper_simulations_owner_idx
  on keeper_simulations (manager_id, season_id, updated_at desc);

alter table keeper_simulations enable row level security;

-- Owner-only reads (co-manager alias emails included). Writes go through the
-- secret-key admin client, which bypasses RLS and always scopes to the owner.
create policy "own simulations" on keeper_simulations
  for select
  to authenticated
  using (
    manager_id in (
      select id from managers where email = (auth.jwt() ->> 'email')
    )
    or manager_id in (
      select manager_id
      from manager_emails
      where email = (auth.jwt() ->> 'email')
    )
  );
