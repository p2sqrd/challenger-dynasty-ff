/**
 * Opens a Rematch Draft for a season — the weeks 12/13/14 repeat matchups,
 * drafted snake style in reverse order of last season's playoff finish.
 *
 *   npx tsx scripts/create-rematch-draft.ts --year 2026 --test
 *   npx tsx scripts/create-rematch-draft.ts --year 2026
 *
 * Test boards are throwaway: they're the only drafts where you can act as
 * another team or reset the picks, and they never notify the league. Run one
 * first, click through all 18 picks, then create the real board.
 *
 * The finishing order comes from FINISH_2025 in src/lib/rematch-draft.ts,
 * which was taken from Sleeper's winners_bracket / losers_bracket.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { FINISH_2025 } from "../src/lib/rematch-draft";

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const year = Number(argValue("--year"));
  const isTest = process.argv.includes("--test");
  if (!year) throw new Error("Usage: --year <year> [--test] [--label <text>]");
  const label =
    argValue("--label") ?? (isTest ? `${year} Rematch Draft — test board` : `${year} Rematch Draft`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set"
    );
  }
  const supabase = createClient<Database>(supabaseUrl, secretKey);

  const { data: season } = await supabase
    .from("seasons")
    .select("id, year")
    .eq("year", year)
    .maybeSingle();
  if (!season) throw new Error(`No season row for ${year} — run create-season.ts first.`);

  const { data: managers } = await supabase
    .from("managers")
    .select("id, display_name");
  const idByName = new Map((managers ?? []).map((m) => [m.display_name, m.id]));

  const orderManagerIds = FINISH_2025.map((displayName) => {
    const id = idByName.get(displayName);
    if (!id) {
      throw new Error(
        `No managers row with display_name "${displayName}" — the finishing ` +
          `order in src/lib/rematch-draft.ts is out of sync with the database.`
      );
    }
    return id;
  });

  const { data: draft, error } = await supabase
    .from("rematch_drafts")
    .insert({
      season_id: season.id,
      is_test: isTest,
      label,
      order_manager_ids: orderManagerIds,
    })
    .select("id")
    .single();
  if (error) throw error;

  console.log(`Created ${isTest ? "test" : "LIVE"} draft "${label}" (${draft.id}).`);
  console.log(`Order, first pick to last: ${[...FINISH_2025].slice(6).join(", ")}, ${[...FINISH_2025].slice(0, 6).reverse().join(", ")}`);
  console.log(`Open it at /rematch-draft/${draft.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
