-- Rule-proposal votes gain a third option: abstain. The old boolean `vote`
-- (true = yes / false = no) can't represent it, so migrate to a `choice` text
-- column constrained to yes / no / abstain. Abstain is a real, recorded choice
-- — it satisfies the keeper vote-gate (a manager has weighed in on the
-- proposal) but counts as neither a Yes nor a No in the pass/fail tally.

alter table rule_proposal_votes add column choice text;

update rule_proposal_votes
  set choice = case when vote then 'yes' else 'no' end;

alter table rule_proposal_votes alter column choice set not null;

alter table rule_proposal_votes
  add constraint rule_proposal_votes_choice_check
  check (choice in ('yes', 'no', 'abstain'));

alter table rule_proposal_votes drop column vote;
