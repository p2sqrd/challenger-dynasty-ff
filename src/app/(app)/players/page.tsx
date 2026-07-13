import { createClient } from "@/lib/supabase/server";
import { getLeagueRosters } from "@/lib/sleeper/client";
import { PageHeader } from "@/components/PageHeader";
import { PlayerLookup, type PlayerDetail } from "@/components/PlayerLookup";

export default async function PlayersPage() {
  const supabase = await createClient();

  const [{ data: records }, { data: managers }, { data: tradeSides }] =
    await Promise.all([
      supabase
        .from("draft_records")
        .select(
          "player_id, player_name, price, source, season:seasons(year), manager:managers(display_name)"
        ),
      supabase.from("managers").select("display_name, sleeper_roster_id"),
      supabase
        .from("trade_sides")
        .select(
          "players_received, manager:managers(display_name), trade:trades(status, season:seasons(year))"
        ),
    ]);

  // Aggregate draft/keeper history per player.
  const byId = new Map<string, PlayerDetail>();
  const idByName = new Map<string, string>();
  for (const r of (records ?? []) as unknown as DraftRecordRow[]) {
    let p = byId.get(r.player_id);
    if (!p) {
      p = {
        playerId: r.player_id,
        playerName: r.player_name,
        currentManager: null,
        history: [],
        trades: [],
      };
      byId.set(r.player_id, p);
    }
    // Keep the most recent name we've seen.
    if ((r.season?.year ?? 0) >= (p.history[0]?.year ?? 0)) {
      p.playerName = r.player_name;
    }
    idByName.set(r.player_name.toLowerCase(), r.player_id);
    p.history.push({
      year: r.season?.year ?? 0,
      price: r.price,
      source: r.source,
      managerName: r.manager?.display_name ?? "—",
    });
  }
  for (const p of byId.values()) {
    p.history.sort((a, b) => b.year - a.year);
  }

  // Current team from live Sleeper rosters.
  const rosterToManager = new Map<number, string>(
    (managers ?? []).map((m) => [m.sleeper_roster_id, m.display_name])
  );
  try {
    const leagueId = process.env.SLEEPER_LEAGUE_ID!;
    const rosters = await getLeagueRosters(leagueId);
    for (const roster of rosters) {
      const managerName = rosterToManager.get(roster.roster_id);
      if (!managerName) continue;
      for (const pid of roster.players ?? []) {
        const p = byId.get(pid);
        if (p) p.currentManager = managerName;
      }
    }
  } catch {
    // Sleeper unavailable — current-team just stays null.
  }

  // Trade history (best-effort: match player by id or by name, since manual
  // trades store free-text names while synced trades store Sleeper ids).
  for (const side of (tradeSides ?? []) as unknown as TradeSideRow[]) {
    if (side.trade?.status !== "approved") continue;
    const year = side.trade?.season?.year ?? 0;
    const managerName = side.manager?.display_name ?? "—";
    for (const token of side.players_received ?? []) {
      const pid = byId.has(token) ? token : idByName.get(token.toLowerCase());
      if (pid) byId.get(pid)!.trades.push({ year, managerName });
    }
  }

  const players = Array.from(byId.values()).sort((a, b) =>
    a.playerName.localeCompare(b.playerName)
  );

  return (
    <div>
      <PageHeader
        title="Players"
        subtitle="Look up any player who's been drafted or kept in the league — their current team, how they've moved, and what they've cost to keep over the years."
      />
      <PlayerLookup players={players} />
    </div>
  );
}

interface DraftRecordRow {
  player_id: string;
  player_name: string;
  price: number;
  source: string;
  season: { year: number } | null;
  manager: { display_name: string } | null;
}

interface TradeSideRow {
  players_received: string[] | null;
  manager: { display_name: string } | null;
  trade: { status: string; season: { year: number } | null } | null;
}
