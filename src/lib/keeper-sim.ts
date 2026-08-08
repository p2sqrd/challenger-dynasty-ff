import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getAllPlayers, getLeagueRosters } from "@/lib/sleeper/client";
import { getManagerAuctionBudget } from "@/lib/budget";
import { getPlayerMeta } from "@/lib/players";
import { computeKeeperPrice } from "@/lib/rules/keeper-pricing";
import { resolveTeam } from "@/lib/teams";

const FANTASY_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);

/** managerId -> the player_ids kept for that team in a simulation. */
export type SimSelections = Record<string, string[]>;

export interface SimTeamPlayer {
  playerId: string;
  name: string;
  position: string | null;
  /** Standard-rules keeper cost, or null when there's no prior record. */
  keeperCost: number | null;
}

export interface SimTeam {
  managerId: string;
  name: string;
  auctionBudget: number;
  roster: SimTeamPlayer[];
}

export interface PoolRow {
  playerId: string;
  playerName: string;
  keeperCost: number | null;
  position: string | null;
  team: string | null;
  /** Real manager name of the roster they're on now; null = free agent. */
  currentManager: string | null;
}

export interface SimBudget {
  managerId: string;
  name: string;
  auctionBudget: number;
  keeperSpend: number;
  remaining: number;
  keeperCount: number;
}

interface Season {
  id: string;
  year: number;
  starting_budget: number;
}

/** Keeper cost per player from the immediately-prior season's draft records. */
async function keeperCostMap(
  supabase: SupabaseClient<Database>,
  seasonYear: number
): Promise<Map<string, number>> {
  const cost = new Map<string, number>();
  const { data: priorSeason } = await supabase
    .from("seasons")
    .select("id")
    .eq("year", seasonYear - 1)
    .maybeSingle();
  if (!priorSeason) return cost;
  const { data: records } = await supabase
    .from("draft_records")
    .select("player_id, price, source")
    .eq("season_id", priorSeason.id);
  for (const r of records ?? []) {
    cost.set(
      r.player_id,
      computeKeeperPrice({ priorRecord: { price: r.price, source: r.source } })
        .newPrice
    );
  }
  return cost;
}

/**
 * Per-team keeper pickers for the Simulate Keepers page: every manager's
 * current roster with each player's keeper cost, plus their auction budget.
 */
export async function loadSimTeams(
  supabase: SupabaseClient<Database>,
  season: Season
): Promise<SimTeam[]> {
  const { data: managers } = await supabase
    .from("managers")
    .select("id, display_name, sleeper_roster_id");
  const mgrs = managers ?? [];

  const cost = await keeperCostMap(supabase, season.year);

  const byRoster = new Map<number, string[]>();
  try {
    const rosters = await getLeagueRosters(process.env.SLEEPER_LEAGUE_ID!);
    for (const r of rosters) byRoster.set(r.roster_id, r.players ?? []);
  } catch {
    // Sleeper unavailable — teams come back with empty rosters.
  }

  const allIds = mgrs.flatMap((m) => byRoster.get(m.sleeper_roster_id) ?? []);
  const meta = await getPlayerMeta(supabase, allIds);

  // Only current teams — departed members have no Sleeper roster.
  const active = mgrs.filter((m) => byRoster.has(m.sleeper_roster_id));

  const teams = await Promise.all(
    active.map(async (m) => {
      const ids = byRoster.get(m.sleeper_roster_id) ?? [];
      const roster: SimTeamPlayer[] = ids
        .map((pid) => {
          const mm = meta.get(pid);
          return {
            playerId: pid,
            name: mm?.name ?? pid,
            position: mm?.position ?? null,
            keeperCost: cost.get(pid) ?? null,
          };
        })
        .sort(
          (a, b) =>
            (b.keeperCost ?? 0) - (a.keeperCost ?? 0) ||
            a.name.localeCompare(b.name)
        );
      const auctionBudget = await getManagerAuctionBudget(
        supabase,
        season.id,
        m.id,
        season.starting_budget
      );
      return {
        managerId: m.id,
        name: resolveTeam(m.display_name).name,
        auctionBudget,
        roster,
      };
    })
  );

  teams.sort((a, b) => a.name.localeCompare(b.name));
  return teams;
}

/**
 * Given a keeper selection per team, compute what a draft would look like: the
 * available player pool (every fantasy-relevant, NFL-rostered player that isn't
 * kept) and each team's remaining auction budget.
 */
export async function computeDraftPool(
  supabase: SupabaseClient<Database>,
  season: Season,
  selections: SimSelections
): Promise<{ pool: PoolRow[]; budgets: SimBudget[] }> {
  const { data: managers } = await supabase
    .from("managers")
    .select("id, display_name, sleeper_roster_id");
  const mgrs = managers ?? [];
  const managerName = new Map(
    mgrs.map((m) => [m.id, resolveTeam(m.display_name).name])
  );

  const cost = await keeperCostMap(supabase, season.year);

  const playerToManagerId = new Map<string, string>();
  // Current teams only — departed members have no Sleeper roster.
  const activeManagerIds = new Set<string>();
  try {
    const rosters = await getLeagueRosters(process.env.SLEEPER_LEAGUE_ID!);
    const rosterToManagerId = new Map(
      mgrs.map((m) => [m.sleeper_roster_id, m.id])
    );
    for (const r of rosters) {
      const mid = rosterToManagerId.get(r.roster_id);
      if (!mid) continue;
      activeManagerIds.add(mid);
      for (const pid of r.players ?? []) playerToManagerId.set(pid, mid);
    }
  } catch {
    // Sleeper unavailable — everyone reads as a free agent.
  }

  const keptSet = new Set<string>();
  for (const ids of Object.values(selections)) {
    for (const id of ids) keptSet.add(id);
  }

  const budgets: SimBudget[] = await Promise.all(
    mgrs
      .filter((m) => activeManagerIds.size === 0 || activeManagerIds.has(m.id))
      .map(async (m) => {
      const picks = selections[m.id] ?? [];
      const keeperSpend = picks.reduce(
        (sum, pid) => sum + (cost.get(pid) ?? 0),
        0
      );
      const auctionBudget = await getManagerAuctionBudget(
        supabase,
        season.id,
        m.id,
        season.starting_budget
      );
      return {
        managerId: m.id,
        name: managerName.get(m.id) ?? m.display_name,
        auctionBudget,
        keeperSpend,
        remaining: auctionBudget - keeperSpend,
        keeperCount: picks.length,
      };
    })
  );
  budgets.sort((a, b) => a.name.localeCompare(b.name));

  const all = await getAllPlayers();
  const pool: PoolRow[] = [];
  for (const [pid, p] of Object.entries(all)) {
    const pos = p.position ?? null;
    if (!pos || !FANTASY_POSITIONS.has(pos)) continue;
    if (!p.team) continue; // no NFL team → not draftable this year
    if (keptSet.has(pid)) continue;
    const ownerId = playerToManagerId.get(pid);
    pool.push({
      playerId: pid,
      playerName:
        p.full_name ||
        `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() ||
        pid,
      keeperCost: cost.get(pid) ?? null,
      position: pos,
      team: p.team,
      currentManager: ownerId ? managerName.get(ownerId) ?? null : null,
    });
  }
  pool.sort((a, b) => {
    if (a.keeperCost === null && b.keeperCost === null)
      return a.playerName.localeCompare(b.playerName);
    if (a.keeperCost === null) return 1;
    if (b.keeperCost === null) return -1;
    return b.keeperCost - a.keeperCost || a.playerName.localeCompare(b.playerName);
  });

  return { pool, budgets };
}
