/**
 * Backfills `draft_records` from Sleeper's own draft history, walking the
 * previous_league_id chain (spec section 0/6). Run with:
 *   npx tsx scripts/backfill-draft-records.ts
 *
 * Requires SLEEPER_LEAGUE_ID, NEXT_PUBLIC_SUPABASE_URL, and
 * SUPABASE_SECRET_KEY in .env.local, and `managers` already seeded (see
 * seed-managers.ts) since picks are matched to managers by Sleeper user id.
 *
 * Known gaps (see spec section 10):
 *  - Only covers picks made *in* an auction draft. Mid-season waiver pickups
 *    aren't part of Sleeper's draft-picks endpoint, so `source: 'waiver'`
 *    rows aren't populated by this script — those need the transactions
 *    import (Phase 2) or manual entry.
 *  - starting_budget defaults to 200 for every season backfilled here. Years
 *    with a different rule (e.g. a hypothetical 250 season) need a manual
 *    correction afterward — Sleeper's draft settings.budget reflects each
 *    team's budget *entering* the auction after keeper deductions, not the
 *    league's starting_budget constant, so it can't be read off automatically.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import {
  getDraftPicks,
  getLeagueChain,
} from "../src/lib/sleeper/client";
import type { Database, DraftSource } from "../src/types/database";

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

  const { data: managers, error: managersError } = await supabase
    .from("managers")
    .select("id, sleeper_user_id");
  if (managersError) throw managersError;
  if (!managers?.length) {
    throw new Error("No managers found — run seed-managers.ts first.");
  }
  const managerIdBySleeperUserId = new Map(
    managers.map((m) => [m.sleeper_user_id, m.id])
  );

  console.log(`Walking league chain from ${leagueId}...`);
  const chain = await getLeagueChain(leagueId);
  console.log(
    `Found ${chain.length} season(s): ${chain.map((l) => l.season).join(", ")}`
  );

  for (const league of chain) {
    if (!league.draft_id) {
      console.log(`Season ${league.season}: no draft_id, skipping.`);
      continue;
    }

    const year = Number(league.season);
    const { data: season, error: seasonError } = await supabase
      .from("seasons")
      .upsert({ year, starting_budget: 200 }, { onConflict: "year" })
      .select("id")
      .single();
    if (seasonError) throw seasonError;

    const picks = await getDraftPicks(league.draft_id);
    console.log(`Season ${league.season}: ${picks.length} picks.`);

    const rows = [];
    for (const pick of picks) {
      const managerId = managerIdBySleeperUserId.get(pick.picked_by);
      if (!managerId) {
        console.warn(
          `  Skipping pick for ${pick.metadata.first_name ?? ""} ${
            pick.metadata.last_name ?? ""
          }: picked_by ${pick.picked_by} has no matching manager.`
        );
        continue;
      }

      const price = Number(pick.metadata.amount ?? 0);
      const playerName = `${pick.metadata.first_name ?? ""} ${
        pick.metadata.last_name ?? ""
      }`.trim();
      const source: DraftSource = pick.is_keeper ? "keeper" : "auction";

      rows.push({
        season_id: season.id,
        manager_id: managerId,
        player_id: pick.player_id,
        player_name: playerName || pick.player_id,
        price,
        source,
      });
    }

    if (rows.length) {
      const { error: insertError } = await supabase
        .from("draft_records")
        .upsert(rows, { onConflict: "season_id,manager_id,player_id" });
      if (insertError) throw insertError;
    }
  }

  console.log("Backfill complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
