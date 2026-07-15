import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * A manager's auction budget for a season — the money they bring into the
 * keeper/auction stage. It's the $200 base (`starting_budget`) plus every
 * cash `trade` adjustment for the season, so a manager who traded money away
 * brings less to the auction (e.g. Pranav's $200 − $23 = $177). `keeper`
 * deductions are tracked separately in the keeper form, so they're excluded
 * here.
 *
 * Falls back to the season's flat starting budget if a manager has no ledger
 * entries yet (e.g. before the annual budget seed is run).
 */
export async function getManagerAuctionBudget(
  supabase: SupabaseClient<Database>,
  seasonId: string,
  managerId: string,
  fallback: number
): Promise<number> {
  const { data } = await supabase
    .from("budget_ledger")
    .select("amount")
    .eq("season_id", seasonId)
    .eq("manager_id", managerId)
    .in("reason", ["starting_budget", "trade"]);

  if (!data || data.length === 0) return fallback;
  return data.reduce((sum, entry) => sum + entry.amount, 0);
}
