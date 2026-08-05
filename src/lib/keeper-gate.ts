import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * A keeper set only counts once its manager has voted on every open rule
 * proposal for the season. "Open" here means every proposal a commissioner
 * hasn't overridden to a final pass/fail — an overridden proposal's outcome is
 * already settled, so a vote on it is moot and we don't require one.
 *
 * All of this is derived from the existing proposal + vote tables (no extra
 * schema): the count of open proposals a manager still hasn't voted on is what
 * gates keeper submission.
 */

async function openProposalIds(
  client: SupabaseClient<Database>,
  seasonId: string
): Promise<string[]> {
  const { data } = await client
    .from("rule_proposals")
    .select("id, override_status")
    .eq("season_id", seasonId);
  return (data ?? [])
    .filter(
      (p) => p.override_status !== "passed" && p.override_status !== "failed"
    )
    .map((p) => p.id);
}

/** How many open proposals this manager still hasn't voted on (0 = all done). */
export async function unvotedProposalCount(
  client: SupabaseClient<Database>,
  seasonId: string,
  managerId: string
): Promise<number> {
  const ids = await openProposalIds(client, seasonId);
  if (ids.length === 0) return 0;
  const { data: votes } = await client
    .from("rule_proposal_votes")
    .select("proposal_id")
    .eq("manager_id", managerId)
    .in("proposal_id", ids);
  const voted = new Set((votes ?? []).map((v) => v.proposal_id));
  return ids.filter((id) => !voted.has(id)).length;
}

/**
 * Per-manager unvoted counts for a whole league in one pass — for the All
 * Keepers and Commish views. Every id in `managerIds` gets an entry.
 */
export async function unvotedCountByManager(
  client: SupabaseClient<Database>,
  seasonId: string,
  managerIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const ids = await openProposalIds(client, seasonId);
  if (ids.length === 0) {
    for (const m of managerIds) result.set(m, 0);
    return result;
  }
  const { data: votes } = await client
    .from("rule_proposal_votes")
    .select("proposal_id, manager_id")
    .in("proposal_id", ids);
  const votedByManager = new Map<string, Set<string>>();
  for (const v of votes ?? []) {
    const set = votedByManager.get(v.manager_id) ?? new Set<string>();
    set.add(v.proposal_id);
    votedByManager.set(v.manager_id, set);
  }
  for (const m of managerIds) {
    const set = votedByManager.get(m);
    result.set(m, set ? ids.filter((id) => !set.has(id)).length : ids.length);
  }
  return result;
}
