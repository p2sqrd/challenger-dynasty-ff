import type {
  SleeperDraft,
  SleeperDraftPick,
  SleeperLeague,
  SleeperMatchup,
  SleeperPlayer,
  SleeperRoster,
  SleeperTransaction,
  SleeperUser,
} from "./types";

const BASE_URL = "https://api.sleeper.app/v1";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Sleeper API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function getLeague(leagueId: string): Promise<SleeperLeague> {
  return get(`/league/${leagueId}`);
}

export function getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
  return get(`/league/${leagueId}/users`);
}

export function getLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
  return get(`/league/${leagueId}/rosters`);
}

export function getLeagueDrafts(leagueId: string): Promise<SleeperDraft[]> {
  return get(`/league/${leagueId}/drafts`);
}

export function getDraftPicks(draftId: string): Promise<SleeperDraftPick[]> {
  return get(`/draft/${draftId}/picks`);
}

export function getTransactions(
  leagueId: string,
  week: number
): Promise<SleeperTransaction[]> {
  return get(`/league/${leagueId}/transactions/${week}`);
}

/**
 * A week's head-to-head results: each roster's points, plus a `matchup_id`
 * that pairs the two rosters who faced each other. Past-season results never
 * change, so we cache for a day to keep the schedule-luck grid off Sleeper's
 * API on every page load.
 */
export async function getMatchups(
  leagueId: string,
  week: number
): Promise<SleeperMatchup[]> {
  const res = await fetch(`${BASE_URL}/league/${leagueId}/matchups/${week}`, {
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) {
    throw new Error(`Sleeper API matchups/${week} failed: ${res.status}`);
  }
  return res.json() as Promise<SleeperMatchup[]>;
}

/**
 * Sleeper's full NFL player dictionary — tens of thousands of entries, and
 * Sleeper asks integrators not to hit this more than once a day. Only used
 * to resolve display names for the keeper selection screen; cached
 * accordingly via Next.js's fetch cache.
 */
export async function getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
  const res = await fetch(`${BASE_URL}/players/nfl`, {
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) {
    throw new Error(`Sleeper API /players/nfl failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Walks the previous_league_id chain starting from the given league,
 * oldest-last. Sleeper gives each season its own league_id and links them
 * backward, so this is how we find every season's draft/roster data without
 * it being configured anywhere in our own database.
 */
export async function getLeagueChain(
  currentLeagueId: string
): Promise<SleeperLeague[]> {
  const chain: SleeperLeague[] = [];
  let leagueId: string | null = currentLeagueId;

  while (leagueId) {
    const league: SleeperLeague = await getLeague(leagueId);
    chain.push(league);
    leagueId = league.previous_league_id;
  }

  return chain;
}
