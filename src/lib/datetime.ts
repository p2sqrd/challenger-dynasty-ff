/**
 * The league runs on Pacific time, so every shared event time — the keeper
 * deadline, draft day — is displayed in it. Pinning the zone (rather than
 * relying on `toLocaleString`'s default) keeps a timestamp reading the same
 * whether it's rendered on the server (whose clock is UTC) or in a viewer's
 * browser, and the "PDT"/"PST" suffix makes it unambiguous.
 */
export const LEAGUE_TIME_ZONE = "America/Los_Angeles";

/**
 * Format a stored ISO timestamp as a league-time label, e.g.
 * "Tue, Aug 12, 9:00 PM PDT". Pass `opts` to override the field selection.
 */
export function formatLeagueDateTime(
  iso: string,
  opts?: Intl.DateTimeFormatOptions
): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: LEAGUE_TIME_ZONE,
    ...opts,
  });
}
