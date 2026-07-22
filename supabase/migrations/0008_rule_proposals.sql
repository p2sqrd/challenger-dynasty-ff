-- 2026 rule proposals: any manager can propose a rule change and every
-- manager casts a single Yes/No vote. Proposing and voting close at the
-- season's keeper deadline; a proposal passes if it reaches a majority of the
-- league (see src/lib/rule-proposals.ts for the threshold). Pass/fail is
-- derived at read time from the deadline + tally, so nothing needs to run when
-- the deadline hits.

create table rule_proposals (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id),
  author_id uuid not null references managers(id),
  title text not null,
  body text,
  created_at timestamptz not null default now()
);

create index rule_proposals_season_idx on rule_proposals (season_id, created_at desc);

alter table rule_proposals enable row level security;
create policy "authenticated read" on rule_proposals for select to authenticated using (true);

-- One Yes/No vote per manager per proposal. Managers can change their vote
-- until the deadline, so writes upsert on this primary key.
create table rule_proposal_votes (
  proposal_id uuid not null references rule_proposals(id) on delete cascade,
  manager_id uuid not null references managers(id),
  -- true = yes, false = no.
  vote boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (proposal_id, manager_id)
);

alter table rule_proposal_votes enable row level security;
create policy "authenticated read" on rule_proposal_votes for select to authenticated using (true);
