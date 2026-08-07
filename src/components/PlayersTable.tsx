"use client";

import { Fragment, useMemo, useState } from "react";
import { Nameplate } from "./Nameplate";
import { PlayerAvatar } from "./PlayerAvatar";
import { MultiSelectFilter } from "./MultiSelectFilter";
import {
  PlayerDetailPanel,
  type PlayerHistoryEntry,
  type PlayerTradeEntry,
} from "./PlayerDetailPanel";

export interface PlayerRow {
  playerId: string;
  playerName: string;
  /** Current keeper cost (next season), or null when not computable. */
  keeperCost: number | null;
  position: string | null;
  team: string | null;
  /** Current manager's display name, or null for a free agent. */
  currentManager: string | null;
  /** Whether kept this season — null until the keeper deadline reveals it. */
  kept: boolean | null;
  history: PlayerHistoryEntry[];
  trades: PlayerTradeEntry[];
}

type SortCol =
  | "name"
  | "keeperCost"
  | "position"
  | "team"
  | "manager"
  | "kept";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortCol; label: string; className?: string }[] = [
  { key: "name", label: "Player" },
  { key: "keeperCost", label: "Keeper $" },
  { key: "position", label: "Pos" },
  { key: "team", label: "NFL" },
  { key: "manager", label: "Current manager" },
  { key: "kept", label: "Kept?" },
];

function sortValue(row: PlayerRow, col: SortCol): string | number | null {
  switch (col) {
    case "name":
      return row.playerName.toLowerCase();
    case "keeperCost":
      return row.keeperCost;
    case "position":
      return row.position ? row.position.toLowerCase() : null;
    case "team":
      return row.team ? row.team.toLowerCase() : null;
    case "manager":
      return row.currentManager ? row.currentManager.toLowerCase() : null;
    case "kept":
      return row.kept === null ? null : row.kept ? 1 : 0;
  }
}

export function PlayersTable({
  players,
  keptRevealed,
}: {
  players: PlayerRow[];
  keptRevealed: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({
    col: "keeperCost",
    dir: "desc",
  });
  const [managers, setManagers] = useState<Set<string>>(new Set());
  const [positions, setPositions] = useState<Set<string>>(new Set());
  const [teams, setTeams] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Filter options, derived from the data.
  const options = useMemo(() => {
    const m = new Set<string>();
    const p = new Set<string>();
    const t = new Set<string>();
    for (const row of players) {
      if (row.currentManager) m.add(row.currentManager);
      if (row.position) p.add(row.position);
      if (row.team) t.add(row.team);
    }
    const sorted = (s: Set<string>) =>
      [...s].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v }));
    return { managers: sorted(m), positions: sorted(p), teams: sorted(t) };
  }, [players]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = players.filter((row) => {
      const isFA = row.currentManager === null;
      if (statuses.size > 0) {
        const ok =
          (isFA && statuses.has("free_agent")) ||
          (!isFA && statuses.has("rostered"));
        if (!ok) return false;
      }
      if (
        managers.size > 0 &&
        (row.currentManager === null || !managers.has(row.currentManager))
      )
        return false;
      if (
        positions.size > 0 &&
        (row.position === null || !positions.has(row.position))
      )
        return false;
      if (teams.size > 0 && (row.team === null || !teams.has(row.team)))
        return false;
      if (q) {
        const hay = [
          row.playerName,
          row.position ?? "",
          row.team ?? "",
          row.currentManager ?? "free agent",
          row.kept === null ? "" : row.kept ? "yes kept" : "no",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const dir = sort.dir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      const av = sortValue(a, sort.col);
      const bv = sortValue(b, sort.col);
      // Nulls always sort last, regardless of direction.
      const an = av === null;
      const bn = bv === null;
      if (an && bn) return a.playerName.localeCompare(b.playerName);
      if (an) return 1;
      if (bn) return -1;
      let r: number;
      if (typeof av === "number" && typeof bv === "number") r = av - bv;
      else r = String(av).localeCompare(String(bv));
      return r === 0 ? a.playerName.localeCompare(b.playerName) : r * dir;
    });
    return filtered;
  }, [players, query, sort, managers, positions, teams, statuses]);

  function toggleSort(col: SortCol) {
    setSort((s) =>
      s.col === col
        ? { col, dir: s.dir === "asc" ? "desc" : "asc" }
        : // Default to descending for the numeric keeper cost, ascending for text.
          { col, dir: col === "keeperCost" || col === "kept" ? "desc" : "asc" }
    );
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players, position, team, manager…"
          className="min-w-[16rem] flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
        />
        <MultiSelectFilter
          label="Manager"
          options={options.managers}
          selected={managers}
          onChange={setManagers}
        />
        <MultiSelectFilter
          label="Position"
          options={options.positions}
          selected={positions}
          onChange={setPositions}
        />
        <MultiSelectFilter
          label="NFL team"
          options={options.teams}
          selected={teams}
          onChange={setTeams}
        />
        <MultiSelectFilter
          label="Roster"
          options={[
            { value: "rostered", label: "Rostered" },
            { value: "free_agent", label: "Free Agent" },
          ]}
          selected={statuses}
          onChange={setStatuses}
        />
      </div>

      <p className="mt-2 text-xs text-muted">
        {rows.length} player{rows.length === 1 ? "" : "s"}
        {!keptRevealed && " · “Kept?” is revealed after the keeper deadline"}
      </p>

      <div className="mt-3 overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              {COLUMNS.map((c) => {
                const active = sort.col === c.key;
                return (
                  <th
                    key={c.key}
                    className={`py-3 font-medium ${
                      c.key === "name" ? "pl-4 pr-4 text-left" : "px-4 text-left"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={`inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-ink ${
                        active ? "text-ink" : ""
                      }`}
                    >
                      {c.label}
                      <span aria-hidden className="text-[9px]">
                        {active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isOpen = expanded.has(row.playerId);
              return (
                <Fragment key={row.playerId}>
                  <tr
                    onClick={() => toggleExpand(row.playerId)}
                    className={`cursor-pointer border-b border-line transition-colors hover:bg-surface-2 ${
                      isOpen ? "bg-surface-2" : ""
                    }`}
                  >
                    <td className="py-2.5 pl-4 pr-4">
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className={`text-[10px] text-muted transition-transform ${
                            isOpen ? "rotate-90" : ""
                          }`}
                        >
                          ▸
                        </span>
                        <PlayerAvatar
                          playerId={row.playerId}
                          name={row.playerName}
                          size={28}
                        />
                        <span className="text-ink">{row.playerName}</span>
                      </span>
                    </td>
                    <td className="tabular px-4 text-ink">
                      {row.keeperCost === null ? (
                        <span className="text-muted">—</span>
                      ) : (
                        `$${row.keeperCost}`
                      )}
                    </td>
                    <td className="px-4 text-muted">{row.position ?? "—"}</td>
                    <td className="px-4 text-muted">{row.team ?? "—"}</td>
                    <td className="px-4">
                      {row.currentManager ? (
                        <Nameplate alias={row.currentManager} size="sm" />
                      ) : (
                        <span className="text-muted">Free Agent</span>
                      )}
                    </td>
                    <td className="px-4">
                      {row.kept === null ? (
                        <span className="text-muted">—</span>
                      ) : row.kept ? (
                        <span className="text-approved">Yes</span>
                      ) : (
                        <span className="text-muted">No</span>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-line bg-canvas">
                      <td colSpan={COLUMNS.length} className="p-4">
                        <PlayerDetailPanel
                          history={row.history}
                          trades={row.trades}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-4 py-8 text-center text-sm text-muted"
                >
                  No players match your search and filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
