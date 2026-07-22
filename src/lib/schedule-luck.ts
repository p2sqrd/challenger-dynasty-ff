import { resolveTeam } from "@/lib/teams";
import {
  getLeague,
  getLeagueChain,
  getLeagueRosters,
  getLeagueUsers,
  getMatchups,
} from "@/lib/sleeper/client";

/**
 * Schedule luck: fantasy head-to-head records depend heavily on the random
 * weekly schedule — you can score well and lose because you happened to draw
 * whoever went off that week. This quantifies it by replaying every team's
 * weekly scores against every other team's schedule.
 *
 * For row team R "playing" column team C's schedule: in each week, R faces
 * whoever C actually faced that week (their weekly scores are fixed). The one
 * wrinkle is the week C actually played R — R can't play themselves, so they
 * play C instead (the standard swap). The diagonal (R under R's own schedule)
 * is therefore R's real record. Each off-diagonal cell shows the hypothetical
 * record and its win delta vs. R's real total. "Luck" summarizes the row: real
 * wins minus the average wins R would get across all *other* schedules — a
 * positive number means R's actual schedule was softer than average.
 */

export interface WeekData {
  /** rosterId -> points scored that week. */
  points: Record<number, number>;
  /** rosterId -> the rosterId they actually played that week. */
  opponent: Record<number, number>;
}

export interface TeamMeta {
  name: string;
  color: string;
  active: boolean;
}

export interface Cell {
  wins: number;
  losses: number;
  ties: number;
  /** Wins under this column's schedule minus the row's real wins. */
  delta: number;
}

export interface TeamLuck {
  rosterId: number;
  name: string;
  color: string;
  active: boolean;
  actual: { wins: number; losses: number; ties: number };
  /** Column rosterId -> hypothetical result under that team's schedule. */
  vs: Record<number, Cell>;
  /** Mean wins across every *other* team's schedule. */
  avgSimWins: number;
  /** actual wins − avgSimWins. Positive = luckier (softer) real schedule. */
  luck: number;
}

export interface ScheduleLuck {
  season: string;
  regularSeasonWeeks: number;
  teams: TeamLuck[];
}

/**
 * Record for `rosterId` playing `scheduleOwner`'s weekly slate. Weeks where
 * either side has no score are skipped, so a mid-season departure doesn't
 * distort things.
 */
function recordFor(
  rosterId: number,
  scheduleOwner: number,
  weeks: WeekData[]
): { wins: number; losses: number; ties: number } {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  for (const week of weeks) {
    let opp = week.opponent[scheduleOwner];
    if (opp === undefined) continue; // schedule owner had no game this week
    if (opp === rosterId) opp = scheduleOwner; // can't play yourself → play them
    const mine = week.points[rosterId];
    const theirs = week.points[opp];
    if (mine === undefined || theirs === undefined) continue;
    if (mine > theirs) wins++;
    else if (mine < theirs) losses++;
    else ties++;
  }
  return { wins, losses, ties };
}

/** Pure core, unit-tested independently of any network calls. */
export function computeScheduleLuck(
  rosterIds: number[],
  meta: Record<number, TeamMeta>,
  weeks: WeekData[]
): TeamLuck[] {
  const teams: TeamLuck[] = rosterIds.map((rid) => {
    const actual = recordFor(rid, rid, weeks);
    const vs: Record<number, Cell> = {};
    let simWinsSum = 0;
    for (const col of rosterIds) {
      const rec = recordFor(rid, col, weeks);
      vs[col] = { ...rec, delta: rec.wins - actual.wins };
      if (col !== rid) simWinsSum += rec.wins;
    }
    const others = Math.max(1, rosterIds.length - 1);
    const avgSimWins = simWinsSum / others;
    const m = meta[rid] ?? { name: `Team ${rid}`, color: "#767C89", active: false };
    return {
      rosterId: rid,
      name: m.name,
      color: m.color,
      active: m.active,
      actual,
      vs,
      avgSimWins,
      luck: actual.wins - avgSimWins,
    };
  });

  // Standings order: most real wins first, then luckiest, then name.
  return teams.sort(
    (a, b) =>
      b.actual.wins - a.actual.wins ||
      b.luck - a.luck ||
      a.name.localeCompare(b.name)
  );
}

/** Build `WeekData` for one week from Sleeper's matchup entries. */
function toWeekData(
  entries: { roster_id: number; matchup_id: number | null; points: number }[]
): WeekData {
  const points: Record<number, number> = {};
  const byMatchup = new Map<number, number[]>();
  for (const e of entries) {
    points[e.roster_id] = e.points;
    if (e.matchup_id != null) {
      const list = byMatchup.get(e.matchup_id) ?? [];
      list.push(e.roster_id);
      byMatchup.set(e.matchup_id, list);
    }
  }
  const opponent: Record<number, number> = {};
  for (const list of byMatchup.values()) {
    if (list.length === 2) {
      opponent[list[0]] = list[1];
      opponent[list[1]] = list[0];
    }
  }
  return { points, opponent };
}

/** Fetch + compute the schedule-luck grid for one season (by league id). */
export async function getScheduleLuck(leagueId: string): Promise<ScheduleLuck> {
  const league = await getLeague(leagueId);
  const playoffStart = Number(
    (league.settings as { playoff_week_start?: number }).playoff_week_start ?? 15
  );
  const lastWeek = Math.max(1, playoffStart - 1);

  const [rosters, users] = await Promise.all([
    getLeagueRosters(leagueId),
    getLeagueUsers(leagueId),
  ]);
  const nameByOwner = new Map(users.map((u) => [u.user_id, u.display_name]));

  const rosterIds = rosters.map((r) => r.roster_id).sort((a, b) => a - b);
  const meta: Record<number, TeamMeta> = {};
  for (const r of rosters) {
    const displayName = r.owner_id ? nameByOwner.get(r.owner_id) : undefined;
    const team = resolveTeam(displayName);
    meta[r.roster_id] = {
      name: team.name,
      color: team.color,
      active: team.active,
    };
  }

  const weekNumbers = Array.from({ length: lastWeek }, (_, i) => i + 1);
  const rawWeeks = await Promise.all(
    weekNumbers.map((w) => getMatchups(leagueId, w).catch(() => []))
  );
  const weeks = rawWeeks
    .map(toWeekData)
    .filter((w) => Object.keys(w.opponent).length > 0);

  return {
    season: league.season,
    regularSeasonWeeks: weeks.length,
    teams: computeScheduleLuck(rosterIds, meta, weeks),
  };
}

/** Completed seasons available for the picker, newest first. */
export async function getCompletedSeasons(
  currentLeagueId: string
): Promise<{ season: string; leagueId: string }[]> {
  const chain = await getLeagueChain(currentLeagueId);
  return chain
    .filter((l) => l.status === "complete")
    .map((l) => ({ season: l.season, leagueId: l.league_id }));
}
