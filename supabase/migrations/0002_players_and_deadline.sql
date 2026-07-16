-- Player-name cache + keeper deadline.
--
-- 1) `players` caches Sleeper's id -> name mapping so pages don't have to
--    download Sleeper's ~5MB /players/nfl dump on every load. Refreshed daily
--    by scripts/refresh-players.ts (and the /api/cron/refresh-players route).
-- 2) seasons gains a keeper deadline (which now *locks* keepers instead of the
--    commissioner approving them) and an optional draft datetime for the
--    countdown timers.

create table if not exists players (
  player_id text primary key,
  full_name text not null,
  position text,
  team text,
  updated_at timestamptz not null default now()
);

alter table players enable row level security;
create policy "authenticated read" on players for select to authenticated using (true);

alter table seasons add column if not exists keeper_deadline timestamptz;
alter table seasons add column if not exists draft_datetime timestamptz;
