import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import {
  buildProposals,
  buildComments,
  majorityThreshold,
  type ProposalStatus,
  type Voter,
} from "@/lib/rule-proposals";
import { PageHeader } from "@/components/PageHeader";
import { RuleProposalForm } from "@/components/RuleProposalForm";
import { RuleProposalVote } from "@/components/RuleProposalVote";
import { RuleProposalDelete } from "@/components/RuleProposalDelete";
import { RuleProposalOverride } from "@/components/RuleProposalOverride";
import { CommentForm } from "@/components/CommentForm";
import { CommentReactions } from "@/components/CommentReactions";
import { CommentDelete } from "@/components/CommentDelete";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface p-5 text-sm text-muted">
      {children}
    </div>
  );
}

const STATUS_STYLES: Record<ProposalStatus, string> = {
  open: "border-line text-muted",
  passed: "border-approved bg-approved/10 text-approved",
  failed: "border-rejected bg-rejected/10 text-rejected",
};
const STATUS_LABEL: Record<ProposalStatus, string> = {
  open: "Open",
  passed: "Passed",
  failed: "Failed",
};

function commentTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function VoterList({ voters }: { voters: Voter[] }) {
  if (voters.length === 0) return <span className="text-muted">—</span>;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {voters.map((v) => (
        <span key={v.managerId} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: v.color }}
          />
          <span className="text-ink">{v.name}</span>
        </span>
      ))}
    </span>
  );
}

export default async function RuleProposalsPage() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  const { data: season } = await supabase
    .from("seasons")
    .select("id, year, keeper_deadline")
    .eq("status", "active")
    .single();

  if (!season) {
    return (
      <div>
        <PageHeader title="Rule Proposals" />
        <Notice>No active season configured yet.</Notice>
      </div>
    );
  }

  const deadline = season.keeper_deadline ? new Date(season.keeper_deadline) : null;
  // Server component: "now" per request is intended.
  // eslint-disable-next-line react-hooks/purity
  const locked = deadline !== null && deadline.getTime() <= Date.now();
  const deadlineLabel = deadline
    ? deadline.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const [{ data: managers }, { data: ledger }, { data: rawProposals }] =
    await Promise.all([
      supabase.from("managers").select("id, display_name"),
      supabase.from("budget_ledger").select("manager_id").eq("season_id", season.id),
      supabase
        .from("rule_proposals")
        .select("id, title, body, author_id, created_at, override_status")
        .eq("season_id", season.id)
        .order("created_at", { ascending: false }),
    ]);

  const nameById = new Map((managers ?? []).map((m) => [m.id, m.display_name]));
  const activeCount = new Set((ledger ?? []).map((l) => l.manager_id)).size || 12;
  const threshold = majorityThreshold(activeCount);

  const proposalIds = (rawProposals ?? []).map((p) => p.id);
  const { data: votes } = proposalIds.length
    ? await supabase
        .from("rule_proposal_votes")
        .select("proposal_id, manager_id, vote")
        .in("proposal_id", proposalIds)
    : { data: [] };

  const proposals = buildProposals({
    proposals: rawProposals ?? [],
    votes: votes ?? [],
    nameById,
    viewerId: manager?.id ?? null,
    threshold,
    locked,
  });

  // Discussion: comments (oldest-first) + their emoji reactions.
  const { data: comments } = proposalIds.length
    ? await supabase
        .from("rule_proposal_comments")
        .select("id, proposal_id, manager_id, body, created_at")
        .in("proposal_id", proposalIds)
        .order("created_at", { ascending: true })
    : { data: [] };
  const commentIds = (comments ?? []).map((c) => c.id);
  const { data: reactions } = commentIds.length
    ? await supabase
        .from("rule_proposal_comment_reactions")
        .select("comment_id, manager_id, emoji")
        .in("comment_id", commentIds)
    : { data: [] };
  const commentsByProposal = buildComments({
    comments: comments ?? [],
    reactions: reactions ?? [],
    nameById,
    viewerId: manager?.id ?? null,
  });

  return (
    <div>
      <PageHeader
        title={`${season.year} Rule Proposals`}
        subtitle={`Propose a rule change and vote Yes or No. A proposal passes if at least ${threshold} of the ${activeCount} managers vote Yes.`}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          {locked ? (
            <span className="text-muted">
              Voting closed{deadlineLabel ? ` on ${deadlineLabel}` : ""}. Results
              are final.
            </span>
          ) : deadlineLabel ? (
            <span className="text-muted">
              Proposing &amp; voting close at the keeper deadline —{" "}
              <span className="text-ink">{deadlineLabel}</span>.
            </span>
          ) : (
            <span className="text-muted">
              Open until the commissioner sets the keeper deadline.
            </span>
          )}
        </div>
        {manager && !locked && <RuleProposalForm />}
      </div>

      {proposals.length === 0 ? (
        <Notice>
          No proposals yet. {locked ? "" : "Be the first to propose a rule change."}
        </Notice>
      ) : (
        <div className="space-y-4">
          {proposals.map((p) => {
            const canDelete =
              !locked &&
              manager != null &&
              (manager.id === p.authorId || manager.role === "commissioner");
            return (
              <div
                key={p.id}
                className="rounded-md border border-line bg-surface p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-medium text-ink">{p.title}</h3>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[p.status]}`}
                  >
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                  <span>by {p.authorName}</span>
                  {p.overridden && (
                    <>
                      <span>·</span>
                      <span className="text-gold">set by commish</span>
                    </>
                  )}
                  {canDelete && (
                    <>
                      <span>·</span>
                      <RuleProposalDelete proposalId={p.id} />
                    </>
                  )}
                </div>

                {p.body && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-muted">
                    {p.body}
                  </p>
                )}

                {/* Tally */}
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="tabular font-medium text-approved">
                    Yes {p.yes.length}
                  </span>
                  <span className="tabular font-medium text-rejected">
                    No {p.no.length}
                  </span>
                  <span className="text-xs text-muted">
                    {p.yes.length}/{threshold} needed to pass
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-wide text-approved">
                      Yes
                    </div>
                    <VoterList voters={p.yes} />
                  </div>
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-wide text-rejected">
                      No
                    </div>
                    <VoterList voters={p.no} />
                  </div>
                </div>

                {((manager && !locked) || manager?.role === "commissioner") && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    {manager && !locked ? (
                      <RuleProposalVote proposalId={p.id} myVote={p.myVote} />
                    ) : (
                      <span />
                    )}
                    {manager?.role === "commissioner" && (
                      <RuleProposalOverride
                        proposalId={p.id}
                        overridden={p.overridden}
                      />
                    )}
                  </div>
                )}

                {/* Discussion */}
                {(() => {
                  const thread = commentsByProposal.get(p.id) ?? [];
                  return (
                    <div className="mt-4 border-t border-line pt-4">
                      <div className="mb-3 text-xs uppercase tracking-wide text-muted">
                        Discussion{thread.length ? ` · ${thread.length}` : ""}
                      </div>
                      {thread.length > 0 && (
                        <ul className="space-y-3">
                          {thread.map((c) => {
                            const canDeleteComment =
                              manager != null &&
                              (manager.id === c.authorId ||
                                manager.role === "commissioner");
                            return (
                              <li key={c.id}>
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                  <span
                                    aria-hidden
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: c.authorColor }}
                                  />
                                  <span className="font-medium text-ink">
                                    {c.authorName}
                                  </span>
                                  <span className="text-xs text-muted">
                                    {commentTime(c.createdAt)}
                                  </span>
                                  {canDeleteComment && (
                                    <CommentDelete
                                      proposalId={p.id}
                                      commentId={c.id}
                                    />
                                  )}
                                </div>
                                <p className="mt-1 whitespace-pre-wrap pl-4 text-sm text-ink">
                                  {c.body}
                                </p>
                                {manager && (
                                  <div className="pl-4">
                                    <CommentReactions
                                      proposalId={p.id}
                                      commentId={c.id}
                                      reactions={c.reactions}
                                    />
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {manager && <CommentForm proposalId={p.id} />}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
