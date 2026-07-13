/**
 * Backfills waiver / free-agent pickups into `draft_records` from Sleeper's
 * transactions, filling the gap the draft-picks endpoint leaves. Run with:
 *   npx tsx scripts/backfill-waiver-costs.ts
 *
 * Sleeper's draft-picks endpoint only knows about auction picks, so a player
 * a manager grabbed off waivers mid-season has no record — and no prior price
 * on the keeper screen. Their keeper salary is the FAAB they were claimed for
 * (min $5, applied by the pricing rules), which lives in the transactions
 * feed. For each season in the league chain, this records the player's most
 * recent waiver/free-agent claim as a `source: 'waiver'` draft record under
 * the claiming manager.
 *
 * Idempotent: never touches existing auction/keeper records, and re-running
 * refreshes waiver rows. Run after seed-managers.ts and
 * backfill-draft-records.ts.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import {
  getAllPlayers,
  getLeagueChain,
  getLeagueRosters,
  getTransactions,
} from "../src/lib/sleeper/client";
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

  const { data: managers, error: managersError } = await supabase
    .from("managers")
    .select("id, sleeper_user_id");
  if (managersError) throw managersError;
  const managerBySleeperUserId = new Map(
    (managers ?? []).map((m) => [m.sleeper_user_id, m.id])
  );

  const allPlayers = await getAllPlayers();
  const chain = await getLeagueChain(leagueId);
  console.log(
    `Walking ${chain.length} season(s): ${chain.map((l) => l.season).join(", ")}`
  );

  let totalInserted = 0;

  for (const league of chain) {
    const year = Number(league.season);
    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("year", year)
      .maybeSingle();
    if (!season) {
      console.log(`Season ${year}: no seasons row, skipping.`);
      continue;
    }

    const rosters = await getLeagueRosters(league.league_id);
    const ownerByRoster = new Map(rosters.map((r) => [r.roster_id, r.owner_id]));
    const endRostered = new Set<string>();
    for (const r of rosters) for (const p of r.players ?? []) endRostered.add(p);

    // Players already drafted/kept this season — never overwrite those.
    const { data: existing } = await supabase
      .from("draft_records")
      .select("player_id, source")
      .eq("season_id", season.id);
    const drafted = new Set(
      (existing ?? [])
        .filter((e) => e.source !== "waiver")
        .map((e) => e.player_id)
    );

    // The most recent waiver/free-agent claim per player sets the salary.
    const lastClaim = new Map<string, { rosterId: number; bid: number }>();
    for (let week = 1; week <= 18; week++) {
      const txs = await getTransactions(league.league_id, week);
      if (!Array.isArray(txs)) continue;
      for (const t of txs) {
        if (t.status !== "complete") continue;
        if (t.type !== "waiver" && t.type !== "free_agent") continue;
        const bid = t.settings?.waiver_bid ?? 0;
        for (const [pid, rosterId] of Object.entries(t.adds ?? {})) {
          lastClaim.set(pid, { rosterId, bid });
        }
      }
    }

    const rows = [];
    for (const pid of endRostered) {
      if (drafted.has(pid)) continue;
      const claim = lastClaim.get(pid);
      if (!claim) continue;
      const ownerUserId = ownerByRoster.get(claim.rosterId);
      const managerId = ownerUserId
        ? managerBySleeperUserId.get(ownerUserId)
        : undefined;
      if (!managerId) continue;

      const p = allPlayers[pid];
      const name =
        p?.full_name ||
        `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() ||
        pid;
      rows.push({
        season_id: season.id,
        manager_id: managerId,
        player_id: pid,
        player_name: name,
        price: claim.bid,
        source: "waiver" as const,
      });
    }

    if (rows.length) {
      const { error } = await supabase
        .from("draft_records")
        .upsert(rows, { onConflict: "season_id,manager_id,player_id" });
      if (error) throw error;
    }
    console.log(`Season ${year}: ${rows.length} waiver pickup(s) recorded.`);
    totalInserted += rows.length;
  }

  console.log(`Done. ${totalInserted} waiver record(s) total.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
