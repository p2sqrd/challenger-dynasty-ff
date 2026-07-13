/**
 * Seeds each manager's 2026 auction budget into `budget_ledger`, per the
 * league's "2026 Draft Math" spreadsheet tab. Run with:
 *   npx tsx scripts/seed-2026-budgets.ts
 *
 * Everyone starts a season with $200, adjusted up or down by the net cash
 * from the prior season's trades (kept within the league's $125–$275 band).
 * Those trades happened before this app existed, so this is a one-time
 * backfill of the opening position. Going forward, in-season trades recorded
 * in the app will accumulate in the ledger and set the next year's number
 * automatically.
 *
 * Idempotent: clears any existing 2026 `starting_budget` entries first.
 * Requires SLEEPER-independent env: NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SECRET_KEY, and `managers` already seeded.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

const SEASON_YEAR = 2026;

// Keyed by Sleeper username (managers.display_name). Value is the
// trade-adjusted auction budget from the 2026 Draft Math sheet.
const BUDGETS: Record<string, number> = {
  mukundc: 150,
  sprtzfan17: 243,
  KartikC: 250,
  omarels: 150,
  ppradhan: 177,
  Pingles: 230,
  vijaysingh1194: 200,
  hnukala: 200,
  hs1: 200,
  aml200: 200,
  krishnaboy: 200,
  ari2jainz: 200,
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
    .select("id, year")
    .eq("year", SEASON_YEAR)
    .single();
  if (seasonError) throw seasonError;

  const { data: managers, error: managersError } = await supabase
    .from("managers")
    .select("id, display_name");
  if (managersError) throw managersError;

  const managerByUsername = new Map(
    (managers ?? []).map((m) => [m.display_name, m.id])
  );

  // Clear prior seed so re-runs don't stack duplicate entries.
  const { error: deleteError } = await supabase
    .from("budget_ledger")
    .delete()
    .eq("season_id", season.id)
    .eq("reason", "starting_budget");
  if (deleteError) throw deleteError;

  const rows = [];
  for (const [username, amount] of Object.entries(BUDGETS)) {
    const managerId = managerByUsername.get(username);
    if (!managerId) {
      console.warn(`  No manager row for "${username}" — skipping.`);
      continue;
    }
    rows.push({
      season_id: season.id,
      manager_id: managerId,
      amount,
      reason: "starting_budget" as const,
    });
  }

  const { error: insertError } = await supabase
    .from("budget_ledger")
    .insert(rows);
  if (insertError) throw insertError;

  console.log(`Seeded ${rows.length} manager budgets for ${SEASON_YEAR}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
