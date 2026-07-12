import { resolveTeam, type Team } from "@/lib/teams";

/**
 * The one unit that looks identical in a card header or a table row: a
 * colored bar in the team's accent + the team name in stadium-signage type.
 * Pass either an `alias` (username / sheet name — resolved via the teams
 * module) or a pre-resolved `team`.
 */
export function Nameplate({
  alias,
  team: teamProp,
  size = "md",
  className = "",
}: {
  alias?: string;
  team?: Team;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const team = teamProp ?? resolveTeam(alias);

  const bar =
    size === "lg" ? "w-1.5 h-7" : size === "sm" ? "w-1 h-4" : "w-1 h-5";
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden
        className={`${bar} shrink-0 rounded-full`}
        style={{ backgroundColor: team.color }}
      />
      <span
        className={`nameplate-type ${text} leading-none ${
          team.active ? "text-ink" : "text-muted"
        }`}
      >
        {team.name}
      </span>
    </span>
  );
}
