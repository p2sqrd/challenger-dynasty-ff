/**
 * One-off / manual refresh of the `players` name cache from Sleeper. The cron
 * route (/api/cron/refresh-players) does the same thing daily in production.
 * Run with: npx tsx scripts/refresh-players.ts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { refreshPlayers } from "../src/lib/refresh-players";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set"
    );
  }
  const supabase = createClient<Database>(supabaseUrl, secretKey);
  const count = await refreshPlayers(supabase);
  console.log(`Cached ${count} players.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
