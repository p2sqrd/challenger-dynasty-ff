-- Co-managed teams: one manager row (a team identity) can have several
-- authorized login emails. Everything that makes up a team — keepers, budget,
-- rule-proposal votes, trades — keys off managers.id, so mapping extra emails
-- to the same manager lets multiple people log in separately and co-manage a
-- single team, with one shared keeper set / budget / vote.

create table manager_emails (
  manager_id uuid not null references managers(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now(),
  primary key (manager_id, email)
);

create index manager_emails_email_idx on manager_emails (email);

alter table manager_emails enable row level security;

-- A member can read only their own alias mapping. (Emails are already
-- readable via the managers table; there's no reason to expose the whole map.)
create policy "read own alias" on manager_emails
  for select
  to authenticated
  using (email = (auth.jwt() ->> 'email'));

-- Extend keeper read access so a co-manager (login email in manager_emails)
-- sees their team's own picks before the deadline, exactly like the primary
-- email does. Rebuilds the 0012 policy with the alias branch added.
drop policy if exists "read own keepers, all after deadline" on keepers;

create policy "read own keepers, all after deadline" on keepers
  for select
  to authenticated
  using (
    -- your own picks, always (primary email)
    manager_id in (
      select id from managers where email = (auth.jwt() ->> 'email')
    )
    -- your own picks, always (co-manager alias email)
    or manager_id in (
      select manager_id
      from manager_emails
      where email = (auth.jwt() ->> 'email')
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

-- Sahil and Sankalp co-manage Vijay's team (roster 12); Vijay stays on it.
insert into manager_emails (manager_id, email) values
  ('6442a5d2-7817-4de4-9c78-52767100964c', 'sahilchhugani@gmail.com'),
  ('6442a5d2-7817-4de4-9c78-52767100964c', 'sankalpraju@gmail.com');
