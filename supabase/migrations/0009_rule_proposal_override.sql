-- Commissioner override: force a proposal's outcome regardless of the tally
-- or deadline. NULL = no override (status derived from votes as usual);
-- 'passed' / 'failed' pin the result. Idempotent so it's safe to re-run.

alter table rule_proposals
  add column if not exists override_status text;
