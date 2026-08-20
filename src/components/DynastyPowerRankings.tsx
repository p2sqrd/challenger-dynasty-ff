"use client";

import { useState, useEffect } from "react";

// ---------------------------------------------------------------------------
// Config — update LEAGUE_ID each Sleeper season (dynasty leagues get a new ID
// annually, chained via previous_league_id on the league object).
// ---------------------------------------------------------------------------
const LEAGUE_ID = "1385714891695874048";
const SLEEPER = "https://api.sleeper.app/v1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerData {
  id: string;
  name: string;
  position: string;
  nflTeam: string | null;
  dynastyValue: number;
  dynastyRank: number | null;
  keeperCost: number | null;
  isKeeper: boolean;
  fairValue: number;
  surplus: number;
}

interface TeamData {
  rosterId: number;
  teamName: string;
  ownerName: string;
  avatar: string | null;
  totalDV: number;
  totalCost: number;
  totalSurplus: number;
  totalFairValue: number;
  players: PlayerData[];
}

interface Methodology {
  totalDV: number;
  totalPool: number;
  dvToDollar: number;
  playerCount: number;
}

type SortMode = "surplus" | "dynasty" | "cost";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const POS_COLORS: Record<string, string> = {
  QB: "#FF6B6B",
  RB: "#5DD39E",
  WR: "#4DA8FF",
  TE: "#FF9D4D",
  K: "#b57edc",
  DEF: "#8891a0",
};

function fmt$(n: number): string {
  return `$${Math.round(n)}`;
}

function fmtVal(n: number): string {
  return Math.round(n).toLocaleString();
}

function sortTeams(teams: TeamData[], mode: SortMode): TeamData[] {
  const sorted = [...teams];
  if (mode === "dynasty") sorted.sort((a, b) => b.totalDV - a.totalDV);
  else if (mode === "cost") sorted.sort((a, b) => a.totalCost - b.totalCost);
  else sorted.sort((a, b) => b.totalSurplus - a.totalSurplus);
  return sorted;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PosBadge({ pos }: { pos: string }) {
  const color = POS_COLORS[pos] ?? "#8891a0";
  return (
    <span
      className="mr-1.5 inline-flex min-w-[26px] items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide"
      style={{ backgroundColor: color, color: "#fff" }}
    >
      {pos}
    </span>
  );
}

function SurplusBar({ value, max }: { value: number; max: number }) {
  if (max === 0) return null;
  const pct = Math.min(Math.abs(value) / max, 1) * 100;
  const isPos = value >= 0;
  const left = isPos ? 50 : 50 - pct / 2;
  const width = pct / 2;
  const color = isPos ? "var(--color-approved)" : "var(--color-rejected)";

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative h-2 w-20 shrink-0 overflow-hidden rounded-full bg-surface-2">
        <div
          className="absolute h-full rounded-full"
          style={{
            left: `${left}%`,
            width: `${width}%`,
            backgroundColor: color,
          }}
        />
        <div className="absolute left-1/2 top-0 h-full w-px" style={{ backgroundColor: "var(--color-line)" }} />
      </div>
      <span
        className="tabular min-w-[40px] text-right text-xs font-semibold"
        style={{ color }}
      >
        {isPos ? "+" : ""}
        {fmt$(value)}
      </span>
    </div>
  );
}

function SortButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-brand bg-brand text-brand-ink"
          : "border-line bg-surface text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Player panel (expanded team detail)
// ---------------------------------------------------------------------------

function PlayerPanel({
  team,
  maxSurplus,
}: {
  team: TeamData;
  maxSurplus: number;
}) {
  const surplusSign = team.totalSurplus >= 0 ? "+" : "";
  const surplusColor =
    team.totalSurplus >= 0 ? "var(--color-approved)" : "var(--color-rejected)";

  return (
    <div className="border-b border-line bg-canvas px-3 pb-4 pt-2">
      {/* Header */}
      <div className="grid grid-cols-[minmax(140px,1fr)_60px_60px_60px_140px] items-center px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
        <span>Player</span>
        <span className="text-right">DV</span>
        <span className="text-right">Cost</span>
        <span className="text-right">Fair $</span>
        <span className="text-right pr-1">Surplus</span>
      </div>

      {/* Player rows */}
      {team.players.map((p) => (
        <div
          key={p.id}
          className="grid grid-cols-[minmax(140px,1fr)_60px_60px_60px_140px] items-center border-t border-line/50 px-2 py-1.5 text-sm"
          style={{ opacity: p.dynastyValue === 0 ? 0.4 : 1 }}
        >
          <div className="flex min-w-0 items-center">
            <PosBadge pos={p.position} />
            <span
              className={`truncate ${p.dynastyValue > 3000 ? "font-semibold text-ink" : "text-ink/80"}`}
            >
              {p.name}
            </span>
            {p.isKeeper && (
              <span className="ml-1.5 shrink-0 text-[9px] font-bold tracking-wide text-brand">
                KEPT
              </span>
            )}
            {p.nflTeam && (
              <span className="ml-1.5 shrink-0 text-[10px] text-muted/60">
                {p.nflTeam}
              </span>
            )}
          </div>
          <span className="tabular text-right text-xs text-muted">
            {fmtVal(p.dynastyValue)}
          </span>
          <span className="tabular text-right text-xs text-muted/70">
            {p.keeperCost !== null ? fmt$(p.keeperCost) : "—"}
          </span>
          <span className="tabular text-right text-xs text-muted/60">
            {fmt$(p.fairValue)}
          </span>
          <div className="justify-self-end">
            <SurplusBar value={p.surplus} max={maxSurplus} />
          </div>
        </div>
      ))}

      {/* Totals */}
      <div className="mt-1 grid grid-cols-[minmax(140px,1fr)_60px_60px_60px_140px] items-center border-t border-line px-2 pt-2 text-sm font-bold">
        <span className="text-muted">
          TOTAL ({team.players.length} players)
        </span>
        <span className="tabular text-right text-xs text-ink/80">
          {fmtVal(team.totalDV)}
        </span>
        <span className="tabular text-right text-xs text-muted">
          {fmt$(team.totalCost)}
        </span>
        <span className="tabular text-right text-xs text-muted">
          {fmt$(team.totalFairValue)}
        </span>
        <div className="justify-self-end">
          <span
            className="tabular text-sm font-bold"
            style={{ color: surplusColor }}
          >
            {surplusSign}
            {fmt$(team.totalSurplus)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Highlight panels (steals & overpays)
// ---------------------------------------------------------------------------

function HighlightPanels({ teams }: { teams: TeamData[] }) {
  const all = teams.flatMap((t) =>
    t.players
      .filter((p) => p.keeperCost !== null && p.dynastyValue > 0)
      .map((p) => ({ ...p, teamName: t.teamName }))
  );

  const steals = [...all].sort((a, b) => b.surplus - a.surplus).slice(0, 8);
  const overpays = [...all].sort((a, b) => a.surplus - b.surplus).slice(0, 8);

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-md border border-line bg-surface p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-approved">
          Biggest Steals
        </h3>
        {steals.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between border-b border-line/50 py-1.5 last:border-0"
          >
            <div className="flex min-w-0 items-center gap-1 text-xs">
              <PosBadge pos={p.position} />
              <span className="truncate font-medium text-ink">{p.name}</span>
              <span className="shrink-0 text-muted/50">{p.teamName}</span>
            </div>
            <div className="ml-2 flex shrink-0 items-center gap-2 text-xs">
              <span className="text-muted/60">
                {fmt$(p.keeperCost!)} cost, {fmt$(p.fairValue)} fair
              </span>
              <span className="font-bold text-approved">
                +{fmt$(p.surplus)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-line bg-surface p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-rejected">
          Biggest Overpays
        </h3>
        {overpays.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between border-b border-line/50 py-1.5 last:border-0"
          >
            <div className="flex min-w-0 items-center gap-1 text-xs">
              <PosBadge pos={p.position} />
              <span className="truncate font-medium text-ink">{p.name}</span>
              <span className="shrink-0 text-muted/50">{p.teamName}</span>
            </div>
            <div className="ml-2 flex shrink-0 items-center gap-2 text-xs">
              <span className="text-muted/60">
                {fmt$(p.keeperCost!)} cost, {fmt$(p.fairValue)} fair
              </span>
              <span className="font-bold text-rejected">{fmt$(p.surplus)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DynastyPowerRankings() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [methodology, setMethodology] = useState<Methodology | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("surplus");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [leagueRes, usersRes, rostersRes, draftsRes, fcRes] =
          await Promise.all([
            fetch(`${SLEEPER}/league/${LEAGUE_ID}`),
            fetch(`${SLEEPER}/league/${LEAGUE_ID}/users`),
            fetch(`${SLEEPER}/league/${LEAGUE_ID}/rosters`),
            fetch(`${SLEEPER}/league/${LEAGUE_ID}/drafts`),
            fetch("/api/dynasty-values"),
          ]);

        if (!leagueRes.ok || !usersRes.ok || !rostersRes.ok || !draftsRes.ok) {
          throw new Error("Failed to fetch league data from Sleeper");
        }
        if (!fcRes.ok) {
          throw new Error("Failed to fetch dynasty values");
        }

        const [users, rosters, drafts, fcData] = await Promise.all([
          usersRes.json(),
          rostersRes.json(),
          draftsRes.json(),
          fcRes.json(),
        ]);

        // Latest draft picks — keeper costs come from here
        const sortedDrafts = [...drafts].sort(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any, b: any) => (b.created || 0) - (a.created || 0)
        );
        const latestDraft = sortedDrafts[0];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let draftPicks: any[] = [];
        if (latestDraft) {
          const picksRes = await fetch(
            `${SLEEPER}/draft/${latestDraft.draft_id}/picks`
          );
          if (picksRes.ok) draftPicks = await picksRes.json();
        }

        // Index FantasyCalc values by Sleeper player ID
        const fcById: Record<
          string,
          {
            name: string;
            position: string;
            team: string | null;
            dynastyValue: number;
            overallRank: number | null;
          }
        > = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const entry of fcData as any[]) {
          if (entry.player?.sleeperId) {
            fcById[entry.player.sleeperId] = {
              name: entry.player.name,
              position: entry.player.position ?? "??",
              team: entry.player.maybeTeam ?? null,
              dynastyValue: entry.value ?? 0,
              overallRank: entry.overallRank ?? null,
            };
          }
        }

        // Index draft costs by player ID
        const draftCostByPlayer: Record<
          string,
          { cost: number | null; isKeeper: boolean }
        > = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const pick of draftPicks as any[]) {
          if (pick.player_id) {
            draftCostByPlayer[pick.player_id] = {
              cost:
                pick.metadata?.amount != null
                  ? parseInt(pick.metadata.amount, 10)
                  : null,
              isKeeper: pick.is_keeper || false,
            };
          }
        }

        // Index users
        const userById: Record<
          string,
          { displayName: string; teamName: string | null; avatar: string | null }
        > = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const u of users as any[]) {
          userById[u.user_id] = {
            displayName: u.display_name || u.username || "Unknown",
            teamName: u.metadata?.team_name ?? null,
            avatar: u.avatar
              ? `https://sleepercdn.com/avatars/thumbs/${u.avatar}`
              : null,
          };
        }

        // Compute totals across all rosters
        let totalDV = 0;
        let totalPlayerCount = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const roster of rosters as any[]) {
          for (const pid of roster.players ?? []) {
            totalDV += fcById[pid]?.dynastyValue ?? 0;
            totalPlayerCount++;
          }
        }

        const totalPool = rosters.length * 200;
        const dvToDollar = totalDV > 0 ? totalPool / totalDV : 0;

        // Build team data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const built: TeamData[] = (rosters as any[]).map((roster) => {
          const owner = userById[roster.owner_id] ?? {
            displayName: `Team ${roster.roster_id}`,
            teamName: null,
            avatar: null,
          };
          const playerIds: string[] = roster.players ?? [];

          let teamDV = 0;
          let teamCost = 0;
          let teamSurplus = 0;
          const players: PlayerData[] = [];

          for (const pid of playerIds) {
            const fc = fcById[pid];
            const di = draftCostByPlayer[pid];
            const dynastyValue = fc?.dynastyValue ?? 0;
            const keeperCost = di?.cost ?? null;
            const isKeeper = di?.isKeeper ?? false;
            const fairValue = dynastyValue * dvToDollar;
            const surplus =
              keeperCost !== null ? fairValue - keeperCost : 0;

            teamDV += dynastyValue;
            if (keeperCost !== null) teamCost += keeperCost;
            teamSurplus += surplus;

            players.push({
              id: pid,
              name: fc?.name ?? `ID: ${pid}`,
              position: fc?.position ?? "??",
              nflTeam: fc?.team ?? null,
              dynastyValue,
              dynastyRank: fc?.overallRank ?? null,
              keeperCost,
              isKeeper,
              fairValue: Math.round(fairValue * 10) / 10,
              surplus: Math.round(surplus * 10) / 10,
            });
          }

          players.sort((a, b) => b.dynastyValue - a.dynastyValue);

          return {
            rosterId: roster.roster_id,
            teamName: owner.teamName || owner.displayName,
            ownerName: owner.displayName,
            avatar: owner.avatar,
            totalDV: teamDV,
            totalCost: teamCost,
            totalSurplus: Math.round(teamSurplus * 10) / 10,
            totalFairValue: Math.round(teamDV * dvToDollar * 10) / 10,
            players,
          };
        });

        if (!cancelled) {
          setTeams(built);
          setMethodology({
            totalDV,
            totalPool,
            dvToDollar,
            playerCount: totalPlayerCount,
          });
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load data"
          );
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // -----------------------------------------------------------------------
  // Loading / error states
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
        <p className="text-sm text-muted">Loading dynasty rankings&hellip;</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-rejected/30 bg-rejected/5 px-5 py-8 text-center">
        <p className="text-base font-semibold text-rejected">
          Failed to load data
        </p>
        <p className="mt-1 text-sm text-muted">{error}</p>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Sorted teams + derived values
  // -----------------------------------------------------------------------

  const sorted = sortTeams(teams, sort);
  const maxAbsSurplus = Math.max(
    ...teams.flatMap((t) => t.players.map((p) => Math.abs(p.surplus))),
    1
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div>
      {/* Methodology */}
      {methodology && (
        <div className="mb-5 rounded-md border border-line bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
          <span className="font-semibold text-ink">How this works: </span>
          Total dynasty value across all {methodology.playerCount} rostered
          players ={" "}
          <span className="tabular">{fmtVal(methodology.totalDV)}</span>{" "}
          FantasyCalc points. Total auction pool ={" "}
          <span className="tabular">${methodology.totalPool.toLocaleString()}</span>.
          Each player&apos;s &ldquo;fair auction price&rdquo; = their share of
          dynasty value, scaled to the total auction pool. Keeper value = fair
          price minus actual keeper/draft cost. Positive surplus means you&apos;re
          getting more value than you paid for. Teams are ranked by total surplus.
        </div>
      )}

      {/* Sort controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Rank by:</span>
        <SortButton
          label="Keeper Value"
          active={sort === "surplus"}
          onClick={() => setSort("surplus")}
        />
        <SortButton
          label="Raw Dynasty Value"
          active={sort === "dynasty"}
          onClick={() => setSort("dynasty")}
        />
        <SortButton
          label="Lowest Cost"
          active={sort === "cost"}
          onClick={() => setSort("cost")}
        />
      </div>

      {/* Team table */}
      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        {/* Header */}
        <div className="grid min-w-[600px] grid-cols-[40px_1fr_90px_80px_100px] items-center border-b border-line px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
          <span>#</span>
          <span>Team</span>
          <span className="text-right">Dynasty Val</span>
          <span className="text-right">Cost</span>
          <span className="text-right">Surplus</span>
        </div>

        {/* Team rows */}
        {sorted.map((team, idx) => {
          const isExpanded = expandedId === team.rosterId;
          const rankColor =
            idx < 3
              ? "text-brand"
              : idx < 8
                ? "text-ink"
                : "text-muted";
          const surplusColor =
            team.totalSurplus > 0
              ? "text-approved"
              : team.totalSurplus < 0
                ? "text-rejected"
                : "text-muted";
          const surplusSign = team.totalSurplus >= 0 ? "+" : "";

          return (
            <div key={team.rosterId}>
              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  setExpandedId(isExpanded ? null : team.rosterId)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedId(isExpanded ? null : team.rosterId);
                  }
                }}
                className={`grid min-w-[600px] cursor-pointer grid-cols-[40px_1fr_90px_80px_100px] items-center border-b border-line px-4 py-3 transition-colors last:border-0 hover:bg-surface-2 ${
                  isExpanded ? "bg-surface-2" : ""
                }`}
              >
                <span className={`text-base font-bold ${rankColor}`}>
                  {idx + 1}
                </span>
                <div className="flex min-w-0 items-center gap-2.5">
                  {team.avatar && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={team.avatar}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-md"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">
                      {team.teamName}
                    </div>
                    {team.teamName !== team.ownerName && (
                      <div className="text-[11px] text-muted/60">
                        {team.ownerName}
                      </div>
                    )}
                  </div>
                </div>
                <span className="tabular text-right text-sm text-ink/80">
                  {fmtVal(team.totalDV)}
                </span>
                <span className="tabular text-right text-sm text-muted">
                  {fmt$(team.totalCost)}
                </span>
                <span
                  className={`tabular text-right text-sm font-bold ${surplusColor}`}
                >
                  {surplusSign}
                  {fmt$(team.totalSurplus)}
                </span>
              </div>

              {isExpanded && (
                <PlayerPanel team={team} maxSurplus={maxAbsSurplus} />
              )}
            </div>
          );
        })}
      </div>

      {/* Steals & Overpays */}
      <HighlightPanels teams={teams} />

      {/* Footer */}
      <p className="mt-6 text-center text-xs text-muted">
        Dynasty values sourced from FantasyCalc (half-PPR, 1QB, 12-team
        dynasty). Keeper costs from Sleeper draft data. Click any team row to
        expand roster details.
      </p>
    </div>
  );
}
