import { resolveTeam } from "@/lib/teams";

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
