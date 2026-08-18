-- Rematch Draft: the league has 12 teams but a 14-week regular season, so
-- weeks 1–11 give everyone 11 unique opponents and weeks 12, 13 and 14 are
-- repeats. Those three repeat matchups are drafted, snake style, in reverse
-- order of last season's playoff finish — the consolation-bracket winner (7th)
-- picks first, the champion (1st) picks last.
--
-- A pick is (opponent, week) and fills that week's slot for BOTH teams, so a
-- 12-team draft is exactly 18 picks. The pick order is DERIVED from
-- order_manager_ids rather than stored, so it can never drift out of sync with
-- the standings it came from.
--
-- Test drafts (is_test) are throwaway boards used to rehearse the order and
-- the picking UI. They are the only drafts where a manager may act as another
-- team, and the only ones that can be reset. See
-- src/app/api/rematch-draft/[id]/pick/route.ts.

create table rematch_drafts (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  is_test boolean not null default false,
  label text not null,
  -- Manager ids in finishing order, 1st → 12th.
  order_manager_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- At most one real draft per season. Test drafts are unconstrained.
create unique index rematch_drafts_live_idx
  on rematch_drafts (season_id) where is_test = false;

create table rematch_picks (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references rematch_drafts(id) on delete cascade,
  pick_number integer not null,
  week integer not null check (week in (12, 13, 14)),
  picker_manager_id uuid not null references managers(id),
  opponent_manager_id uuid not null references managers(id),
  created_at timestamptz not null default now(),
  check (picker_manager_id <> opponent_manager_id),
  -- The turn latch. Unlike the Fire Sale (where a lost race degrades into the
  -- seller breaking a tie by hand), draft order genuinely matters here, so the
  -- pick route claims turn N by inserting pick_number = N. A racing second
  -- writer hits this constraint and gets a 409 instead of silently taking a
  -- turn that was validated against a stale board.
  unique (draft_id, pick_number),
  -- Belt-and-braces: a team can't appear twice in the same week on the same
  -- side. The cross case (picker in one row, opponent in another) is covered
  -- by application validation, which the turn latch above makes authoritative.
  unique (draft_id, week, picker_manager_id),
  unique (draft_id, week, opponent_manager_id)
);

create index rematch_picks_draft_idx on rematch_picks (draft_id, pick_number);

alter table rematch_drafts enable row level security;
alter table rematch_picks enable row level security;

-- The draft is public to the league — everyone watches the board live. Writes
-- go through the secret-key admin client after the route checks whose turn it
-- is, per the RLS strategy in 0001_init.sql.
create policy "authenticated read" on rematch_drafts
  for select
  to authenticated
  using (true);

create policy "authenticated read" on rematch_picks
  for select
  to authenticated
  using (true);
