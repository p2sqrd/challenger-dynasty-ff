-- Per-manager keeper-edit override. Normally keepers lock for everyone at the
-- season's keeper_deadline. Setting keepers_unlocked = true lets a specific
-- manager keep editing/submitting past the deadline — used for one-off
-- corrections (e.g. a trade that was missed in the initial data import, where
-- the affected managers need to re-pick against a corrected budget) without
-- reopening the deadline for the whole league. Flip back to false once they've
-- re-submitted.

alter table managers
  add column if not exists keepers_unlocked boolean not null default false;
