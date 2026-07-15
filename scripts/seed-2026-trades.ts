/**
 * Decomposes each manager's 2026 auction budget into a $200 base plus the
 * individual trade adjustments recorded on the "2026 Draft Math" tab of the
 * league spreadsheet, so the Budget page can show every transaction that
 * produced the current number. The per-manager totals are unchanged — base +
 * trades reconciles exactly to the current budgets we seeded earlier
 * (Pranav $200 − $23 = $177, Hirsch $200 + $43 = $243, etc.).
 *
 * Idempotent: clears this season's `starting_budget` and `trade` ledger rows
 * before reinserting, so re-running is safe. Run with:
 *   npx tsx scripts/seed-2026-trades.ts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

// Trade adjustments keyed by Sleeper username (managers.display_name), taken
// column-by-column from the 2026 Draft Math sheet. Empty = no 2026 trades.
const TRADES_BY_USERNAME: Record<string, number[]> = {
  mukundc: [-45, -5],
  sprtzfan17: [2, 45, -15, 2, 4, 5],
  KartikC: [5, 6, 39],
  omarels: [-2, -8, -4, -6, -30],
  ppradhan: [8, 15, -2, -5, -39],
  Pingles: [30],
  vijaysingh1194: [],
  hnukala: [],
  hs1: [],
  aml200: [],
  krishnaboy: [],
  ari2jainz: [],
};

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set"
    );
  }
  const supabase = createClient<Database>(supabaseUrl, secretKey);

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, year, starting_budget")
    .eq("status", "active")
    .single();
  if (seasonError) throw seasonError;
  const base = season.starting_budget;
  console.log(`Active season ${season.year}, base budget $${base}.`);

  const { data: managers, error: managersError } = await supabase
    .from("managers")
    .select("id, display_name");
  if (managersError) throw managersError;

  for (const manager of managers ?? []) {
    const trades = TRADES_BY_USERNAME[manager.display_name];
    if (trades === undefined) {
      console.log(`  ${manager.display_name}: not in sheet, skipping.`);
      continue;
    }

    // Clear prior base/trade rows for this manager + season, then rebuild.
    await supabase
      .from("budget_ledger")
      .delete()
      .eq("season_id", season.id)
      .eq("manager_id", manager.id)
      .in("reason", ["starting_budget", "trade"]);

    const rows = [
      {
        season_id: season.id,
        manager_id: manager.id,
        amount: base,
        reason: "starting_budget" as const,
      },
      ...trades.map((amount) => ({
        season_id: season.id,
        manager_id: manager.id,
        amount,
        reason: "trade" as const,
      })),
    ];

    const { error } = await supabase.from("budget_ledger").insert(rows);
    if (error) throw error;

    const total = base + trades.reduce((s, a) => s + a, 0);
    console.log(
      `  ${manager.display_name}: $${base} base + ${trades.length} trade(s) = $${total}`
    );
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
