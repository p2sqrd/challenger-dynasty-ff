/**
 * Imports completed trades from Sleeper into `trades` + `trade_sides`. Run with:
 *   npx tsx scripts/sync-trades.ts
 *
 * This is a thin CLI wrapper around src/lib/sync-trades.ts — the same logic
 * now also powers the in-app "Sync from Sleeper" button and the scheduled cron
 * (/api/cron/sync-trades). Requires SLEEPER_LEAGUE_ID, NEXT_PUBLIC_SUPABASE_URL,
 * and SUPABASE_SECRET_KEY in .env.local, and `managers` already seeded.
 *
 * SLEEPER_LEAGUE_ID must point at the Sleeper league for the season currently
 * open in this app; update it when the league rolls over to a new season.
 *
 * Every trade lands as status 'pending_cash' (managers enter their cash side
 * from the Trades page). Safe to re-run — already-imported trades are skipped.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { syncTrades } from "../src/lib/sync-trades";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set"
    );
  }

  const supabase = createClient<Database>(supabaseUrl, secretKey);
  const r = await syncTrades(supabase);

  console.log(
    `Imported ${r.imported} new trade(s) for ${r.season}` +
      (r.skipped > 0 ? ` (${r.skipped} already imported)` : "") +
      (r.unmatched > 0 ? `; ${r.unmatched} skipped (unmatched roster)` : "") +
      "."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
