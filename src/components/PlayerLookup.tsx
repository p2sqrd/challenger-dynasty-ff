"use client";

import { useMemo, useState } from "react";
import { Nameplate } from "./Nameplate";
import { KeeperCostChart } from "./KeeperCostChart";

export interface PlayerDetail {
  playerId: string;
  playerName: string;
  currentManager: string | null;
  history: { year: number; price: number; source: string; managerName: string }[];
  trades: { year: number; managerName: string }[];
}

export function PlayerLookup({ players }: { players: PlayerDetail[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return players
      .filter((p) => p.playerName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, players]);

  const selected = players.find((p) => p.playerId === selectedId) ?? null;

  return (
    <div>
      <div className="relative max-w-md">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedId(null);
          }}
          placeholder="Search a player…"
          className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
        />
        {query && !selected && matches.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-line bg-surface shadow-lg">
            {matches.map((p) => (
              <li key={p.playerId}>
                <button
                  onClick={() => {
                    setSelectedId(p.playerId);
                    setQuery(p.playerName);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink hover:bg-surface-2"
                >
                  <span>{p.playerName}</span>
                  {p.currentManager && (
                    <span className="text-xs text-muted">
                      {p.history[0]?.year ?? ""}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {query && !selected && matches.length === 0 && (
          <p className="mt-2 text-sm text-muted">
            No player by that name has been drafted or kept in the league.
          </p>
        )}
      </div>

      {selected && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="nameplate-type text-2xl text-ink">
              {selected.playerName}
            </h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted">Current team:</span>
              {selected.currentManager ? (
                <Nameplate alias={selected.currentManager} size="sm" />
              ) : (
                <span className="text-muted">Not rostered</span>
              )}
            </div>
          </div>

          <section className="mt-6">
            <h3 className="nameplate-type text-sm text-muted">
              Keeper cost over the years
            </h3>
            <div className="mt-3 rounded-md border border-line bg-surface p-4">
              <KeeperCostChart
                points={selected.history.map((h) => ({
                  year: h.year,
                  price: h.price,
                  source: h.source,
                }))}
              />
            </div>
          </section>

          <section className="mt-8">
            <h3 className="nameplate-type text-sm text-muted">
              Transaction history
            </h3>
            <ul className="mt-3 divide-y divide-line rounded-md border border-line bg-surface">
              {buildTimeline(selected).map((row, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <span className="flex items-center gap-3">
                    <span className="tabular w-12 text-muted">{row.year}</span>
                    <Nameplate alias={row.managerName} size="sm" />
                  </span>
                  <span className="text-muted">{row.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

interface TimelineRow {
  year: number;
  managerName: string;
  detail: string;
}

const SOURCE_VERB: Record<string, string> = {
  auction: "Drafted",
  keeper: "Kept",
  waiver: "Added off waivers",
};

/** Merge draft/keeper records and trades into one reverse-chronological list. */
function buildTimeline(player: PlayerDetail): TimelineRow[] {
  const rows: TimelineRow[] = [];
  for (const h of player.history) {
    rows.push({
      year: h.year,
      managerName: h.managerName,
      detail: `${SOURCE_VERB[h.source] ?? h.source} · $${h.price}`,
    });
  }
  for (const t of player.trades) {
    rows.push({ year: t.year, managerName: t.managerName, detail: "Traded to" });
  }
  return rows.sort((a, b) => b.year - a.year);
}
