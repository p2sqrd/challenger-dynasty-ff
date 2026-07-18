"use client";

import { useMemo, useState } from "react";
import { Nameplate } from "./Nameplate";
import { resolveTeam } from "@/lib/teams";

export interface YearRecord {
  w: number | null;
  l: number | null;
  playoffs: number | null;
}

export interface ManagerStanding {
  name: string;
  w: number;
  l: number;
  winPct: number;
  rsTitles: number | null;
  playoffApps: number | null;
  semis: number | null;
  finals: number | null;
  champs: number | null;
  sacko: number | null;
  byYear: Record<number, YearRecord>;
}

// Numeric stat columns share one comparator; Team sorts by resolved display
// name. `desc` is the natural first click for stats (more is more), `asc` for
// the name.
type SortKey =
  | "name"
  | "w"
  | "l"
  | "winPct"
  | "rsTitles"
  | "playoffApps"
  | "finals"
  | "champs"
  | "sacko";
type Dir = "asc" | "desc";

const COLUMNS: {
  key: SortKey;
  label: string;
  title?: string;
  align: "left" | "right";
}[] = [
  { key: "name", label: "Team", align: "left" },
  { key: "w", label: "W", align: "right" },
  { key: "l", label: "L", align: "right" },
  { key: "winPct", label: "Pct", align: "right" },
  { key: "rsTitles", label: "Titles", title: "Regular-season titles", align: "right" },
  { key: "playoffApps", label: "Playoffs", title: "Playoff appearances", align: "right" },
  { key: "finals", label: "Finals", title: "Finals appearances", align: "right" },
  { key: "champs", label: "Rings", title: "Championships", align: "right" },
  { key: "sacko", label: "Sacko", title: "Last-place finishes", align: "right" },
];

function num(v: number | null) {
  return v === null ? "—" : String(v);
}

function defaultDir(key: SortKey): Dir {
  return key === "name" ? "asc" : "desc";
}

export function StandingsTable({ rows }: { rows: ManagerStanding[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("winPct");
  const [dir, setDir] = useState<Dir>("desc");

  const sorted = useMemo(() => {
    const val = (m: ManagerStanding): string | number | null =>
      sortKey === "name" ? resolveTeam(m.name).name : m[sortKey];

    return [...rows].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      // Missing values always sink to the bottom, regardless of direction.
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return dir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
  }, [rows, sortKey, dir]);

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDir(defaultDir(key));
    }
  }

  return (
    <div className="overflow-x-auto rounded-md border border-line bg-surface">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <th className="w-12 py-3 pl-4 pr-2 text-left font-medium">#</th>
            {COLUMNS.map((col) => {
              const active = col.key === sortKey;
              return (
                <th
                  key={col.key}
                  title={col.title}
                  aria-sort={
                    active ? (dir === "asc" ? "ascending" : "descending") : "none"
                  }
                  className={`py-3 pr-4 font-medium ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className={`inline-flex select-none items-center gap-1 transition-colors hover:text-ink ${
                      col.align === "right" ? "flex-row-reverse" : ""
                    } ${active ? "text-ink" : ""}`}
                  >
                    {col.label}
                    <span
                      aria-hidden
                      className={`text-[9px] ${active ? "text-brand" : "text-line"}`}
                    >
                      {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((m, i) => {
            const isTop = i === 0;
            const rings = m.champs ?? 0;
            return (
              <tr
                key={m.name}
                className="border-b border-line transition-colors last:border-0 hover:bg-surface-2"
              >
                <td className="py-3 pl-4 pr-2">
                  <span
                    className={`tabular text-sm ${isTop ? "text-gold" : "text-muted"}`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <Nameplate alias={m.name} />
                </td>
                <td className="tabular py-3 pr-4 text-right text-ink">{m.w}</td>
                <td className="tabular py-3 pr-4 text-right text-muted">{m.l}</td>
                <td className="tabular py-3 pr-4 text-right text-ink">
                  {(m.winPct * 100).toFixed(1)}
                </td>
                <td className="tabular py-3 pr-4 text-right text-muted">{num(m.rsTitles)}</td>
                <td className="tabular py-3 pr-4 text-right text-muted">{num(m.playoffApps)}</td>
                <td className="tabular py-3 pr-4 text-right text-muted">{num(m.finals)}</td>
                <td className="tabular py-3 pr-4 text-right">
                  {rings > 0 ? (
                    <span className="text-gold">★ {rings}</span>
                  ) : (
                    <span className="text-muted">{num(m.champs)}</span>
                  )}
                </td>
                <td className="tabular py-3 pr-4 text-right text-muted">{num(m.sacko)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
