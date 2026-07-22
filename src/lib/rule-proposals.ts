import { resolveTeam } from "@/lib/teams";

/** The fixed palette managers can react to comments with. */
export const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎯", "👎"] as const;

export type ProposalStatus = "open" | "passed" | "failed";

export interface Voter {
  managerId: string;
  name: string;
  color: string;
}

export interface ProposalWithTally {
  id: string;
  title: string;
  body: string | null;
  authorId: string;
  authorName: string;
  createdAt: string;
  yes: Voter[];
  no: Voter[];
  /** The viewer's current vote, if any (true = yes, false = no). */
  myVote: boolean | null;
  status: ProposalStatus;
  /** True when the status was pinned by a commissioner override. */
  overridden: boolean;
}

/**
 * Whole-league majority: a proposal passes only if more than half of the
 * active managers vote Yes (e.g. 7 of 12). Turnout matters — a rule nobody
 * votes on fails.
 */
export function majorityThreshold(activeManagerCount: number): number {
  return Math.floor(activeManagerCount / 2) + 1;
}

/** Open until voting closes (the keeper deadline); then pass/fail is final. */
export function computeStatus(
  yesCount: number,
  threshold: number,
  locked: boolean
): ProposalStatus {
  if (!locked) return "open";
  return yesCount >= threshold ? "passed" : "failed";
}

export interface RawProposal {
  id: string;
  title: string;
  body: string | null;
  author_id: string;
  created_at: string;
  /** Commissioner override: 'passed' | 'failed' pins the status; null = derive. */
  override_status?: string | null;
}

export interface RawVote {
  proposal_id: string;
  manager_id: string;
  vote: boolean;
}

/**
 * Join proposals with their votes into display-ready tallies. `nameById` maps
 * a manager id to their stored display name; it's resolved to the canonical
 * team name + color here so proposals match the rest of the app.
 */
export function buildProposals({
  proposals,
  votes,
  nameById,
  viewerId,
  threshold,
  locked,
}: {
  proposals: RawProposal[];
  votes: RawVote[];
  nameById: Map<string, string>;
  viewerId: string | null;
  threshold: number;
  locked: boolean;
}): ProposalWithTally[] {
  const votesByProposal = new Map<string, RawVote[]>();
  for (const v of votes) {
    const list = votesByProposal.get(v.proposal_id) ?? [];
    list.push(v);
    votesByProposal.set(v.proposal_id, list);
  }

  const voterOf = (managerId: string): Voter => {
    const team = resolveTeam(nameById.get(managerId));
    return { managerId, name: team.name, color: team.color };
  };

  return proposals.map((p) => {
    const rows = votesByProposal.get(p.id) ?? [];
    const yes = rows.filter((r) => r.vote).map((r) => voterOf(r.manager_id));
    const no = rows.filter((r) => !r.vote).map((r) => voterOf(r.manager_id));
    yes.sort((a, b) => a.name.localeCompare(b.name));
    no.sort((a, b) => a.name.localeCompare(b.name));

    const mine = viewerId
      ? rows.find((r) => r.manager_id === viewerId)?.vote ?? null
      : null;

    // A commissioner override pins the outcome regardless of the tally or
    // whether voting is still open.
    const overridden =
      p.override_status === "passed" || p.override_status === "failed";
    const status: ProposalStatus = overridden
      ? (p.override_status as ProposalStatus)
      : computeStatus(yes.length, threshold, locked);

    return {
      id: p.id,
      title: p.title,
      body: p.body,
      authorId: p.author_id,
      authorName: resolveTeam(nameById.get(p.author_id)).name,
      createdAt: p.created_at,
      yes,
      no,
      myVote: mine,
      status,
      overridden,
    };
  });
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  /** Whether the viewer has this reaction on the comment. */
  mine: boolean;
  /** Display names of everyone who reacted with this emoji. */
  names: string[];
}

export interface CommentView {
  id: string;
  proposalId: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  body: string;
  createdAt: string;
  reactions: ReactionSummary[];
}

export interface RawComment {
  id: string;
  proposal_id: string;
  manager_id: string;
  body: string;
  created_at: string;
}

export interface RawReaction {
  comment_id: string;
  manager_id: string;
  emoji: string;
}

/**
 * Group comments by proposal (oldest-first, as stored) and roll each
 * comment's reactions into per-emoji summaries.
 */
export function buildComments({
  comments,
  reactions,
  nameById,
  viewerId,
}: {
  comments: RawComment[];
  reactions: RawReaction[];
  nameById: Map<string, string>;
  viewerId: string | null;
}): Map<string, CommentView[]> {
  const reactionsByComment = new Map<string, RawReaction[]>();
  for (const r of reactions) {
    const list = reactionsByComment.get(r.comment_id) ?? [];
    list.push(r);
    reactionsByComment.set(r.comment_id, list);
  }

  const byProposal = new Map<string, CommentView[]>();
  for (const c of comments) {
    const rows = reactionsByComment.get(c.id) ?? [];
    const byEmoji = new Map<string, RawReaction[]>();
    for (const r of rows) {
      const list = byEmoji.get(r.emoji) ?? [];
      list.push(r);
      byEmoji.set(r.emoji, list);
    }
    const summaries: ReactionSummary[] = [...byEmoji.entries()]
      .map(([emoji, list]) => ({
        emoji,
        count: list.length,
        mine: viewerId ? list.some((x) => x.manager_id === viewerId) : false,
        names: list.map((x) => resolveTeam(nameById.get(x.manager_id)).name),
      }))
      .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));

    const team = resolveTeam(nameById.get(c.manager_id));
    const view: CommentView = {
      id: c.id,
      proposalId: c.proposal_id,
      authorId: c.manager_id,
      authorName: team.name,
      authorColor: team.color,
      body: c.body,
      createdAt: c.created_at,
      reactions: summaries,
    };
    const list = byProposal.get(c.proposal_id) ?? [];
    list.push(view);
    byProposal.set(c.proposal_id, list);
  }
  return byProposal;
}
