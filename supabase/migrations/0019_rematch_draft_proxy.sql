-- Picking on someone else's behalf in the Rematch Draft.
--
-- A snake draft stalls when one of twelve people goes quiet, and the board
-- can't advance past a team that won't click. So one manager can make the pick
-- for whoever is on the clock.
--
-- Gated by a per-manager flag rather than the commissioner role, same as
-- is_ranking_author in 0015_rankings.sql: the commissioner role carries trade
-- approvals, deadline setting and rule-proposal overrides, and this is none of
-- those. Pranav runs the Rematch Draft; that's the whole scope of the flag.
alter table managers
  add column if not exists can_pick_for_others boolean not null default false;

update managers
  set can_pick_for_others = true
  where display_name = 'ppradhan';

-- Who actually clicked, when that isn't the team the pick belongs to. Null on
-- a team's own pick, so "was this made for them?" is one non-null check and
-- the rows written before this migration need no backfill.
--
-- The pick itself still belongs to picker_manager_id: the board, the turn
-- latch and every rule read the same as before. This column is the record of
-- who stepped in, and it's what puts the flag on the week card.
alter table rematch_picks
  add column if not exists made_by_manager_id uuid references managers(id);
