/**
 * Canonical team identity + color system (visual design brief, "signature
 * idea"): every league member gets exactly one accent color, assigned once
 * and used everywhere that member is referenced — standings, trade cards,
 * budget ledger, keeper lists.
 *
 * The two data sources use different names for the same people: the live
 * app (managers table) stores Sleeper usernames, while the historical
 * Standings/Archive pages use first names from the league's spreadsheet.
 * This module is the single place that reconciles them, so a member looks
 * the same — same name, same color — regardless of which page they appear
 * on. The database is left untouched (usernames stay as-is so magic-link
 * auth and re-seeding keep working); the mapping lives entirely in the
 * presentation layer here.
 *
 * Colors are a fixed categorical set, each verified >= 4.5:1 (WCAG AA)
 * against the #12151B background. Assignment is intentional but arbitrary —
 * it carries no meaning beyond "distinct per member."
 */

export interface Team {
  /** Stable canonical key (real first name, lowercased). */
  key: string;
  /** Real name shown in the UI. */
  name: string;
  /** Accent color — the member's identity everywhere. */
  color: string;
  /** false for members who have left the league (muted treatment). */
  active: boolean;
}

/** Muted steel for members who have left — reads as "retired", not a team. */
const RETIRED_COLOR = "#767C89";

interface TeamSeed {
  name: string;
  color: string;
  active: boolean;
  /** Every alias this person is known by: Sleeper usernames + sheet names. */
  aliases: string[];
}

const SEEDS: TeamSeed[] = [
  { name: "Pranav", color: "#4DA8FF", active: true, aliases: ["ppradhan", "Pranav"] },
  { name: "Ari", color: "#C083FF", active: true, aliases: ["ari2jainz", "Ari"] },
  { name: "Hirsch", color: "#FF6B6B", active: true, aliases: ["sprtzfan17", "Hirsch"] },
  { name: "Omar", color: "#5DD39E", active: true, aliases: ["omarels", "Omar"] },
  { name: "Mukund", color: "#FF9D4D", active: true, aliases: ["mukundc", "Mukund"] },
  { name: "Kartik", color: "#F368C9", active: true, aliases: ["KartikC", "Kartik"] },
  { name: "Murali", color: "#B4D33A", active: true, aliases: ["krishnaboy", "Murali"] },
  { name: "Arun", color: "#6E8BFF", active: true, aliases: ["Pingles", "Arun"] },
  { name: "Harish", color: "#FF6F91", active: true, aliases: ["hs1", "Harish"] },
  { name: "Aditya", color: "#9B8CFF", active: true, aliases: ["aml200", "Aditya", "Adi"] },
  {
    name: "Vijay",
    color: "#3BD1C4",
    active: true,
    aliases: ["vijaysingh1194", "Vijay", "Villages (Vijay)"],
  },
  { name: "Harsha", color: "#7FA8D9", active: true, aliases: ["hnukala", "Harsha"] },
  // Former members — muted, referenced only in historical data.
  {
    name: "Ahmad",
    color: RETIRED_COLOR,
    active: false,
    aliases: ["Ahmad", "Chuggy's Lil Angels (Ahmad)"],
  },
  { name: "Josh", color: RETIRED_COLOR, active: false, aliases: ["Josh"] },
  { name: "Currymonstur", color: RETIRED_COLOR, active: false, aliases: ["currymonstur"] },
  { name: "JoeVillegas", color: RETIRED_COLOR, active: false, aliases: ["JoeVillegas"] },
];

const TEAM_BY_ALIAS = new Map<string, Team>();
for (const seed of SEEDS) {
  const team: Team = {
    key: seed.name.toLowerCase(),
    name: seed.name,
    color: seed.color,
    active: seed.active,
  };
  for (const alias of seed.aliases) {
    TEAM_BY_ALIAS.set(alias.toLowerCase(), team);
  }
}

/**
 * Resolve any known alias (Sleeper username or sheet name) to a Team.
 * Departed-member usernames carry a suffix in the database
 * (e.g. "currymonstur (left league)"), so we also try the leading token.
 * Unknown names fall back to a muted, name-as-given team so the UI never
 * breaks on data we didn't anticipate.
 */
export function resolveTeam(alias: string | null | undefined): Team {
  if (!alias) return { key: "unknown", name: "—", color: RETIRED_COLOR, active: false };

  const exact = TEAM_BY_ALIAS.get(alias.toLowerCase());
  if (exact) return exact;

  const leadingToken = alias.split(/[\s(]/)[0];
  const byToken = TEAM_BY_ALIAS.get(leadingToken.toLowerCase());
  if (byToken) return byToken;

  return {
    key: alias.toLowerCase(),
    name: leadingToken || alias,
    color: RETIRED_COLOR,
    active: false,
  };
}
