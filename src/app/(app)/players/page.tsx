import { createClient } from "@/lib/supabase/server";
import { getLeagueRosters } from "@/lib/sleeper/client";
import { getPlayerMeta } from "@/lib/players";
import { computeKeeperPrice } from "@/lib/rules/keeper-pricing";
import { PageHeader } from "@/components/PageHeader";
import { PlayersTable, type PlayerRow } from "@/components/PlayersTable";

interface Working {
  playerId: string;
  playerName: string;
  currentManager: string | null;
  history: { year: number; price: number; source: string; managerName: string }[];
  trades: { year: number; managerName: string }[];
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

export default async function PlayersPage() {
  const supabase = await createClient();

  const [{ data: activeSeason }, { data: records }, { data: managers }, { data: tradeSides }] =
    await Promise.all([
      supabase
        .from("seasons")
        .select("id, year, keeper_deadline")
        .eq("status", "active")
        .maybeSingle(),
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
  const byId = new Map<string, Working>();
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
  for (const p of byId.values()) p.history.sort((a, b) => b.year - a.year);

  // Current team from live Sleeper rosters. Players on a roster with no draft
  // history still belong in the table — add them as history-less entries.
  const rosterToManager = new Map<number, string>(
    (managers ?? []).map((m) => [m.sleeper_roster_id, m.display_name])
  );
  try {
    const rosters = await getLeagueRosters(process.env.SLEEPER_LEAGUE_ID!);
    for (const roster of rosters) {
      const managerName = rosterToManager.get(roster.roster_id);
      if (!managerName) continue;
      for (const pid of roster.players ?? []) {
        let p = byId.get(pid);
        if (!p) {
          p = {
            playerId: pid,
            playerName: pid,
            currentManager: managerName,
            history: [],
            trades: [],
          };
          byId.set(pid, p);
        } else {
          p.currentManager = managerName;
        }
      }
    }
  } catch {
    // Sleeper unavailable — current-team just stays null (all "Free Agent").
  }

  // Trade history (match by id, or by name for manual free-text trades).
  for (const side of (tradeSides ?? []) as unknown as TradeSideRow[]) {
    if (side.trade?.status !== "approved") continue;
    const year = side.trade?.season?.year ?? 0;
    const managerName = side.manager?.display_name ?? "—";
    for (const token of side.players_received ?? []) {
      const pid = byId.has(token) ? token : idByName.get(token.toLowerCase());
      if (pid) byId.get(pid)!.trades.push({ year, managerName });
    }
  }

  const ids = [...byId.keys()];

  // Name / position / NFL team for every player in the table.
  const meta = await getPlayerMeta(supabase, ids);

  // Current keeper cost = standard-rules estimate from the immediately-prior
  // season's draft record (the same basis as the Keepers page). Fetch that
  // whole season once rather than filtering by hundreds of ids.
  const keeperCost = new Map<string, number>();
  if (activeSeason) {
    const { data: priorSeason } = await supabase
      .from("seasons")
      .select("id")
      .eq("year", activeSeason.year - 1)
      .maybeSingle();
    if (priorSeason) {
      const { data: priorRecords } = await supabase
        .from("draft_records")
        .select("player_id, price, source")
        .eq("season_id", priorSeason.id);
      for (const r of priorRecords ?? []) {
        keeperCost.set(
          r.player_id,
          computeKeeperPrice({
            priorRecord: { price: r.price, source: r.source },
          }).newPrice
        );
      }
    }
  }

  // "Kept?" is only revealed once the keeper deadline has passed — before then
  // picks are private, so we don't even read them.
  const deadline = activeSeason?.keeper_deadline
    ? new Date(activeSeason.keeper_deadline)
    : null;
  // Server component: "now" per request is intended.
  // eslint-disable-next-line react-hooks/purity
  const keptRevealed = deadline !== null && deadline.getTime() <= Date.now();
  const keptSet = new Set<string>();
  if (keptRevealed && activeSeason) {
    const { data: keepers } = await supabase
      .from("keepers")
      .select("player_id")
      .eq("season_id", activeSeason.id);
    for (const k of keepers ?? []) keptSet.add(k.player_id);
  }

  const rows: PlayerRow[] = [...byId.values()].map((p) => {
    const m = meta.get(p.playerId);
    return {
      playerId: p.playerId,
      playerName: m?.name ?? p.playerName,
      keeperCost: keeperCost.get(p.playerId) ?? null,
      position: m?.position ?? null,
      team: m?.team ?? null,
      currentManager: p.currentManager,
      kept: keptRevealed ? keptSet.has(p.playerId) : null,
      history: p.history,
      trades: p.trades,
    };
  });

  return (
    <div>
      <PageHeader
        title="Players"
        subtitle="Every player in the league — sorted by current keeper cost. Search or filter to find anyone, and click a row for their keeper-cost history and transactions."
      />
      <PlayersTable
        players={rows}
        keptRevealed={keptRevealed}
        keeperYear={activeSeason?.year}
      />
    </div>
  );
}
