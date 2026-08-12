/**
 * Archived 2025 rankings, kept as static data for the Rankings page's "2025"
 * tab — a look back at where each team was ranked after keepers versus where
 * they actually finished. Not editable; it's history.
 */

/**
 * The 2025 Post-Keeper Rankings, in order (1 = top). Each string is a team
 * alias resolvable via `resolveTeam` for the nameplate + color. The original
 * was a simple ranked list of names, reproduced faithfully here.
 */
export const POST_KEEPER_2025: string[] = [
  "Mukund",
  "Aditya",
  "Ari",
  "Arun",
  "Omar",
  "Harsha",
  "Pranav",
  "Vijkalp",
  "Kartik",
  "Murali",
  "Hirsch",
  "Harish",
];

export interface FinalStanding2025 {
  rank: number;
  /** Sleeper team name as it appeared on the standings screen. */
  teamName: string;
  /** Sleeper username — resolves to the member's canonical team + color. */
  alias: string;
  wins: number;
  losses: number;
  /** Points for / points against. */
  pf: number;
  pa: number;
  /** Remaining FAAB waiver budget and the season-end waiver order in parens. */
  waiverBudget: number;
  waiverOrder: number;
}

/**
 * 2025 Actual Final Standings, straight from Sleeper (regular-season finish).
 */
export const FINAL_STANDINGS_2025: FinalStanding2025[] = [
  { rank: 1, teamName: "The Doctor Is In", alias: "aml200", wins: 10, losses: 4, pf: 1580.66, pa: 1349.41, waiverBudget: 55, waiverOrder: 8 },
  { rank: 2, teamName: "hnukala", alias: "hnukala", wins: 10, losses: 4, pf: 1470.45, pa: 1345.75, waiverBudget: 100, waiverOrder: 1 },
  { rank: 3, teamName: "Marvin's Room", alias: "mukundc", wins: 10, losses: 4, pf: 1402.48, pa: 1298.04, waiverBudget: 0, waiverOrder: 12 },
  { rank: 4, teamName: "U Feelin Foxy?", alias: "omarels", wins: 9, losses: 5, pf: 1617.8, pa: 1477.43, waiverBudget: 0, waiverOrder: 10 },
  { rank: 5, teamName: "Villegas Villages", alias: "vijaysingh1194", wins: 9, losses: 5, pf: 1487.74, pa: 1404.57, waiverBudget: 0, waiverOrder: 9 },
  { rank: 6, teamName: "Never been to finals", alias: "hs1", wins: 8, losses: 6, pf: 1340.55, pa: 1295.22, waiverBudget: 30, waiverOrder: 7 },
  { rank: 7, teamName: "It's Gonna Be Maye", alias: "ppradhan", wins: 7, losses: 7, pf: 1605.07, pa: 1541.24, waiverBudget: 0, waiverOrder: 11 },
  { rank: 8, teamName: "Pony Tollard", alias: "Pingles", wins: 5, losses: 9, pf: 1532.12, pa: 1501.93, waiverBudget: 59, waiverOrder: 6 },
  { rank: 9, teamName: "LAMARVELOUS", alias: "ari2jainz", wins: 5, losses: 9, pf: 1430.5, pa: 1533.13, waiverBudget: 16, waiverOrder: 4 },
  { rank: 10, teamName: "sprtzfan17", alias: "sprtzfan17", wins: 5, losses: 9, pf: 1213.47, pa: 1378.17, waiverBudget: 0, waiverOrder: 5 },
  { rank: 11, teamName: "krishnaboy", alias: "krishnaboy", wins: 3, losses: 11, pf: 1156.73, pa: 1492.72, waiverBudget: 95, waiverOrder: 2 },
  { rank: 12, teamName: "Make Karrtik Great Again", alias: "KartikC", wins: 3, losses: 11, pf: 1145.91, pa: 1365.87, waiverBudget: 0, waiverOrder: 3 },
];
