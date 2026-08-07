/**
 * Colors for the position + NFL-team badges shown next to a player's name.
 * Position colors match the keeper-page roster badges (see BudgetTower); NFL
 * team colors are each team's primary.
 */

/** Position accents — same hues as the keeper roster slots. */
const POSITION_COLORS: Record<string, string> = {
  QB: "#FF6B6B",
  RB: "#5DD39E",
  WR: "#4DA8FF",
  TE: "#FF9D4D",
  DEF: "#767C89",
};

export function positionColor(position: string | null): string {
  if (!position) return "#767C89";
  return POSITION_COLORS[position.toUpperCase()] ?? "#767C89";
}

/** Each NFL team's primary color, keyed by Sleeper abbreviation. */
const NFL_TEAM_COLORS: Record<string, string> = {
  ARI: "#97233F",
  ATL: "#A71930",
  BAL: "#241773",
  BUF: "#00338D",
  CAR: "#0085CA",
  CHI: "#0B162A",
  CIN: "#FB4F14",
  CLE: "#311D00",
  DAL: "#041E42",
  DEN: "#FB4F14",
  DET: "#0076B6",
  GB: "#203731",
  HOU: "#03202F",
  IND: "#002C5F",
  JAX: "#006778",
  KC: "#E31837",
  LAC: "#0080C6",
  LAR: "#003594",
  LV: "#000000",
  MIA: "#008E97",
  MIN: "#4F2683",
  NE: "#002244",
  NO: "#D3BC8D",
  NYG: "#0B2265",
  NYJ: "#125740",
  PHI: "#004C54",
  PIT: "#FFB612",
  SEA: "#002244",
  SF: "#AA0000",
  TB: "#D50A0A",
  TEN: "#0C2340",
  WAS: "#5A1414",
  // Legacy abbreviations that may appear in older data.
  OAK: "#000000",
  SD: "#0080C6",
  STL: "#003594",
  WSH: "#5A1414",
};

/** A team's primary color, or a neutral gray for an unknown abbreviation. */
export function nflTeamColor(team: string | null): string | null {
  if (!team) return null;
  return NFL_TEAM_COLORS[team.toUpperCase()] ?? "#5A6472";
}

/** Black or white, whichever reads better on the given background hex. */
export function contrastText(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length < 6) return "#FFFFFF";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0B0D12" : "#FFFFFF";
}
