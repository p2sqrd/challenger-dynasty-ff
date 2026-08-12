-- Post-Keeper / Post-Draft power rankings, authored by a small set of managers
-- and shared read-only with the league once published.
--
-- Access is gated by a per-manager flag rather than the commissioner role, so
-- ranking duty can be handed to anyone without touching league permissions.
-- Omar and Pranav are the current authors.

alter table managers
  add column if not exists is_ranking_author boolean not null default false;

update managers
  set is_ranking_author = true
  where display_name in ('omarels', 'ppradhan');

-- One ranking per (season, kind). `entries` is the ordered, editable payload:
-- a JSON array of { managerId, draftNeeds, explanation } in ranked order.
-- Roster / kept players / budgets are NEVER stored here — they're derived live
-- from keepers + Sleeper so the ranking always reflects reality and can't leak
-- picks before the keeper deadline.
create table rankings (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  kind text not null check (kind in ('post_keeper', 'post_draft')),
  entries jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references managers(id),
  unique (season_id, kind)
);

alter table rankings enable row level security;

-- Anyone signed in can read a ranking once it's published; authors can read
-- their own drafts before that. Writes go through the secret-key admin client
-- (which bypasses RLS) and are author-gated in the API layer.
create policy "read published or author" on rankings
  for select
  to authenticated
  using (
    published = true
    or exists (
      select 1
      from managers m
      where m.email = (auth.jwt() ->> 'email')
        and m.is_ranking_author = true
    )
    or exists (
      select 1
      from manager_emails me
      join managers m on m.id = me.manager_id
      where me.email = (auth.jwt() ->> 'email')
        and m.is_ranking_author = true
    )
  );
