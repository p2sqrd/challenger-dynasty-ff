/**
 * Imports completed trades from Sleeper into `trades` + `trade_sides`, per
 * spec section 0/6 (Phase 2). Run with:
 *   npx tsx scripts/sync-trades.ts
 *
 * Requires SLEEPER_LEAGUE_ID, NEXT_PUBLIC_SUPABASE_URL, and
 * SUPABASE_SECRET_KEY in .env.local, and `managers` already seeded — trade
 * sides are matched to managers by Sleeper roster ID.
 *
 * SLEEPER_LEAGUE_ID must point at the Sleeper league object for the season
 * currently open in this app (a `seasons` row with status 'active') — when
 * Sleeper's commissioner tools roll the league over to a new season, update
 * this env var to the new league_id before running.
 *
 * Every trade lands as status 'pending_cash': Sleeper only knows which
 * players moved, not the real-dollar side payments this league's economy
 * runs on, so each manager involved still has to enter their side's cash
 * amount from the Trades page before it reaches the commissioner's approval
 * queue. Safe to re-run — already-imported trades are skipped by
 * sleeper_transaction_id.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { getLeague, getTransactions } from "../src/lib/sleeper/client";
import type { Database } from "../src/types/database";

async function main() {
  const leagueId = process.env.SLEEPER_LEAGUE_ID;
  if (!leagueId) throw new Error("SLEEPER_LEAGUE_ID is not set");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set"
    );
  }

  const supabase = createClient<Database>(supabaseUrl, secretKey);

  const league = await getLeague(leagueId);
  const year = Number(league.season);

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, year, status")
    .eq("year", year)
    .maybeSingle();
  if (seasonError) throw seasonError;
  if (!season) {
    throw new Error(
      `No seasons row for ${year} — run create-season.ts first.`
    );
  }

  const { data: managers, error: managersError } = await supabase
    .from("managers")
    .select("id, sleeper_roster_id");
  if (managersError) throw managersError;
  if (!managers?.length) {
    throw new Error("No managers found — run seed-managers.ts first.");
  }
  const managerIdByRosterId = new Map(
    managers.map((m) => [m.sleeper_roster_id, m.id])
  );

  let imported = 0;
  let skippedExisting = 0;

  for (let week = 1; week <= 18; week++) {
    const transactions = await getTransactions(leagueId, week);
    const trades = transactions.filter(
      (t) => t.type === "trade" && t.status === "complete"
    );

    for (const tx of trades) {
      const { data: existing } = await supabase
        .from("trades")
        .select("id")
        .eq("sleeper_transaction_id", tx.transaction_id)
        .maybeSingle();
      if (existing) {
        skippedExisting++;
        continue;
      }

      const sides = tx.roster_ids.map((rosterId) => {
        const managerId = managerIdByRosterId.get(rosterId);
        const playersReceived = Object.entries(tx.adds ?? {})
          .filter(([, receivingRosterId]) => receivingRosterId === rosterId)
          .map(([playerId]) => playerId);
        return { rosterId, managerId, playersReceived };
      });

      const unmatched = sides.filter((s) => !s.managerId);
      if (unmatched.length > 0) {
        console.warn(
          `  Skipping trade ${tx.transaction_id}: roster(s) ${unmatched
            .map((s) => s.rosterId)
            .join(", ")} have no matching manager.`
        );
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

      imported++;
    }
  }

  console.log(
    `Imported ${imported} new trade(s) for ${year}${
      skippedExisting > 0 ? ` (${skippedExisting} already imported)` : ""
    }.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
