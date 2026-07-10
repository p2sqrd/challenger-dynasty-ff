/**
 * Creates (or updates) a season row. Run once per year when it's time to
 * open keeper selection, e.g.:
 *   npx tsx scripts/create-season.ts --year 2026 --budget 200
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const year = Number(argValue("--year"));
  const budget = Number(argValue("--budget") ?? 200);
  if (!year) throw new Error("Usage: --year <year> [--budget <amount>]");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set"
    );
  }

  const supabase = createClient<Database>(supabaseUrl, secretKey);

  const { error } = await supabase
    .from("seasons")
    .upsert(
      { year, starting_budget: budget, status: "active" },
      { onConflict: "year" }
    );
  if (error) throw error;

  console.log(`Season ${year} is now active with a $${budget} starting budget.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
