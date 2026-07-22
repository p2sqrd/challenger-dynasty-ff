-- Discussion on rule proposals: flat comments (no threading) plus emoji
-- reactions on each comment. Reads are open to authenticated users; writes go
-- through the server.

create table rule_proposal_comments (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references rule_proposals(id) on delete cascade,
  manager_id uuid not null references managers(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index rule_proposal_comments_proposal_idx
  on rule_proposal_comments (proposal_id, created_at);

alter table rule_proposal_comments enable row level security;
create policy "authenticated read" on rule_proposal_comments
  for select to authenticated using (true);

-- One row per (comment, manager, emoji): a manager can add several different
-- emojis to a comment but each only once. Toggling a reaction deletes the row.
create table rule_proposal_comment_reactions (
  comment_id uuid not null references rule_proposal_comments(id) on delete cascade,
  manager_id uuid not null references managers(id),
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, manager_id, emoji)
);

alter table rule_proposal_comment_reactions enable row level security;
create policy "authenticated read" on rule_proposal_comment_reactions
  for select to authenticated using (true);
