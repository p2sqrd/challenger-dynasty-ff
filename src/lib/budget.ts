import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * A manager's auction budget for a season — the money they bring into the
 * keeper/auction stage. It's the sum of their `starting_budget` ledger
 * entries, which bake in the prior season's cash trades (so it's $200 minus
 * whatever they traded away, e.g. Pranav's $177). In-season `trade` entries
 * roll into the *next* season's starting budget, and `keeper` deductions are
 * tracked separately, so both are intentionally excluded here.
 *
 * Falls back to the season's flat starting budget if a manager has no
 * starting_budget entry yet (e.g. before the annual budget seed is run).
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
    .eq("reason", "starting_budget");

  if (!data || data.length === 0) return fallback;
  return data.reduce((sum, entry) => sum + entry.amount, 0);
}
