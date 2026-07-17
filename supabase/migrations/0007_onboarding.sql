-- Onboarding: remember whether a manager has seen the welcome walkthrough, so
-- it auto-opens once on first login. They can reopen it anytime from the "?".

alter table managers add column if not exists onboarded_at timestamptz;
