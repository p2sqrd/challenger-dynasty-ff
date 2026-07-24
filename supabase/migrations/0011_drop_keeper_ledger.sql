-- Keepers no longer go through commissioner approval, and their cost is no
-- longer mirrored into the budget ledger. Keeper spend is derived directly
-- from the `keepers` table (summed once the deadline locks selections in), so
-- any previously-written keeper ledger rows are now dead data that would
-- double-count against the table-derived figure. Remove them.
delete from public.budget_ledger where reason = 'keeper';
