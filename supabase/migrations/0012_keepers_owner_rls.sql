-- Enforce keeper privacy at the database, not just in the UI.
--
-- The original policy — "authenticated read using (true)" — let ANY logged-in
-- league member read the entire keepers table straight from the Supabase API,
-- bypassing the app's "hidden until the keeper deadline" behavior. A curious
-- member could scrape everyone's picks early.
--
-- Replace it so a manager can read:
--   * their OWN keeper picks, anytime; and
--   * EVERYONE's picks, only once that season's keeper deadline has passed
--     (matching the league-wide reveal on the Keepers page).
--
-- No commissioner bypass on purpose — nobody, not even the commish, sees
-- others' picks before the deadline. Server-side writes go through the
-- secret-key admin client, which bypasses RLS, so submissions are unaffected.

drop policy if exists "authenticated read" on keepers;

create policy "read own keepers, all after deadline" on keepers
  for select
  to authenticated
  using (
    -- your own picks, always
    manager_id in (
      select id from managers where email = (auth.jwt() ->> 'email')
    )
    -- everyone's picks, once this season's keeper deadline has passed
    or exists (
      select 1
      from seasons s
      where s.id = keepers.season_id
        and s.keeper_deadline is not null
        and s.keeper_deadline <= now()
    )
  );
