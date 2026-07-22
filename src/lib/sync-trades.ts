import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getLeague, getTransactions } from "@/lib/sleeper/client";

export interface SyncTradesResult {
  season: number;
  imported: number;
  skipped: number;
  /** Trades skipped because a roster had no matching manager. */
  unmatched: number;
}

/**
 * Import completed trades from Sleeper into `trades` + `trade_sides` for the
 * app's active season. Every trade lands as `pending_cash` — Sleeper only
 * knows which players moved, not this league's real-dollar side payments, so
 * each manager still enters their cash on the Trades page before it reaches
 * the commissioner's approval queue. Safe to re-run: already-imported trades
 * are skipped by `sleeper_transaction_id`.
 *
 * Shared by the manual "Sync from Sleeper" button, the scheduled cron, and the
 * `scripts/sync-trades.ts` CLI. Needs a client that can write (admin/secret
 * key) and managers already seeded (sides match by Sleeper roster id).
 */
export async function syncTrades(
  supabase: SupabaseClient<Database>,
  leagueId: string | undefined = process.env.SLEEPER_LEAGUE_ID
): Promise<SyncTradesResult> {
  if (!leagueId) throw new Error("SLEEPER_LEAGUE_ID is not set.");

  const league = await getLeague(leagueId);
  const year = Number(league.season);

  // Only ever import into the app's ACTIVE season, and only when the
  // configured Sleeper league is actually for that season. Sleeper mints a new
  // league_id every year, so a stale SLEEPER_LEAGUE_ID would otherwise quietly
  // write another season's trades into the wrong (often closed) season.
  const { data: season } = await supabase
    .from("seasons")
    .select("id, year")
    .eq("status", "active")
    .single();
  if (!season) {
    throw new Error("No active season configured.");
  }
  if (season.year !== year) {
    throw new Error(
      `The configured Sleeper league is for ${year}, but the active season is ${season.year}. Update SLEEPER_LEAGUE_ID to the current league.`
    );
  }

  const { data: managers } = await supabase
    .from("managers")
    .select("id, sleeper_roster_id");
  if (!managers?.length) {
    throw new Error("No managers configured.");
  }
  const managerIdByRosterId = new Map(
    managers.map((m) => [m.sleeper_roster_id, m.id])
  );

  // Pull the season's already-imported Sleeper ids once, rather than a query
  // per candidate trade.
  const { data: existing } = await supabase
    .from("trades")
    .select("sleeper_transaction_id")
    .eq("season_id", season.id)
    .not("sleeper_transaction_id", "is", null);
  const seen = new Set(
    (existing ?? []).map((t) => t.sleeper_transaction_id as string)
  );

  let imported = 0;
  let skipped = 0;
  let unmatched = 0;

  for (let week = 1; week <= 18; week++) {
    const transactions = await getTransactions(leagueId, week);
    const trades = transactions.filter(
      (t) => t.type === "trade" && t.status === "complete"
    );

    for (const tx of trades) {
      if (seen.has(tx.transaction_id)) {
        skipped++;
        continue;
      }

      const sides = tx.roster_ids.map((rosterId) => ({
        managerId: managerIdByRosterId.get(rosterId),
        playersReceived: Object.entries(tx.adds ?? {})
          .filter(([, receivingRosterId]) => receivingRosterId === rosterId)
          .map(([playerId]) => playerId),
      }));

      if (sides.some((s) => !s.managerId)) {
        unmatched++;
        continue;
      }

      const { data: trade, error: tradeError } = await supabase
        .from("trades")
        .insert({
          sleeper_transaction_id: tx.transaction_id,
          season_id: season.id,
          status: "pending_cash",
        })
        .select("id")
        .single();
      if (tradeError) throw tradeError;

      const { error: sidesError } = await supabase.from("trade_sides").insert(
        sides.map((s) => ({
          trade_id: trade.id,
          manager_id: s.managerId!,
          players_received: s.playersReceived,
        }))
      );
      if (sidesError) throw sidesError;

      seen.add(tx.transaction_id);
      imported++;
    }
  }

  return { season: year, imported, skipped, unmatched };
}
