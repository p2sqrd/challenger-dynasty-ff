"use client";

import { useEffect, useMemo, useState } from "react";
import {
  validateKeeperRoster,
  ROSTER_SIZE,
} from "@/lib/rules/budget-validation";
import { Nameplate } from "./Nameplate";
import { PlayersTable, type PlayerRow } from "./PlayersTable";
import type {
  SimTeam,
  SimSelections,
  PoolRow,
  SimBudget,
} from "@/lib/keeper-sim";

interface SavedSim {
  id: string;
  name: string;
  selections: SimSelections;
  updated_at: string;
}

/**
 * Client-side keeper sandbox: pick keepers for every team (your own real ones
 * pre-filled), save/load named scenarios, then simulate the resulting draft
 * pool and each team's remaining budget. Nothing here writes league data.
 */
export function KeeperSimulator({
  teams,
  prefill,
  myManagerId,
}: {
  teams: SimTeam[];
  prefill: SimSelections;
  myManagerId: string | null;
}) {
  const [selections, setSelections] = useState<Record<string, Set<string>>>(
    () => {
      const init: Record<string, Set<string>> = {};
      for (const t of teams) init[t.managerId] = new Set(prefill[t.managerId] ?? []);
      return init;
    }
  );
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(myManagerId ? [myManagerId] : [])
  );
  const [result, setResult] = useState<{
    pool: PoolRow[];
    budgets: SimBudget[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [sims, setSims] = useState<SavedSim[]>([]);
  const [name, setName] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    void refreshSims();
  }, []);

  async function refreshSims() {
    try {
      const r = await fetch("/api/keeper-sim");
      if (r.ok) {
        const b = await r.json();
        setSims(b.sims ?? []);
      }
    } catch {
      // Save/load simply unavailable — the rest of the sandbox still works.
    }
  }

  const costById = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of teams)
      for (const p of t.roster)
        if (p.keeperCost != null) m.set(p.playerId, p.keeperCost);
    return m;
  }, [teams]);

  function spendFor(managerId: string): number {
    let s = 0;
    for (const pid of selections[managerId] ?? []) s += costById.get(pid) ?? 0;
    return s;
  }

  // Same rules as setting your own keepers: stay within budget and keep enough
  // to fill all 16 roster spots at $1 each.
  function validateTeam(t: SimTeam) {
    return validateKeeperRoster({
      startingBudget: t.auctionBudget,
      totalKeeperSpend: spendFor(t.managerId),
      keeperCount: selections[t.managerId]?.size ?? 0,
      rosterSize: ROSTER_SIZE,
    });
  }

  const invalidTeams = useMemo(
    () =>
      teams.filter((t) => {
        let spend = 0;
        for (const pid of selections[t.managerId] ?? [])
          spend += costById.get(pid) ?? 0;
        return !validateKeeperRoster({
          startingBudget: t.auctionBudget,
          totalKeeperSpend: spend,
          keeperCount: selections[t.managerId]?.size ?? 0,
          rosterSize: ROSTER_SIZE,
        }).ok;
      }),
    [teams, selections, costById]
  );

  function toggle(managerId: string, playerId: string) {
    setSelections((prev) => {
      const next = { ...prev };
      const set = new Set(next[managerId] ?? []);
      if (set.has(playerId)) set.delete(playerId);
      else set.add(playerId);
      next[managerId] = set;
      return next;
    });
    setResult(null); // selections changed → any computed pool is now stale
  }

  function toggleTeam(managerId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(managerId)) next.delete(managerId);
      else next.add(managerId);
      return next;
    });
  }

  function exportSelections(): SimSelections {
    const out: SimSelections = {};
    for (const [mid, set] of Object.entries(selections))
      if (set.size) out[mid] = [...set];
    return out;
  }

  function clearAll() {
    const next: Record<string, Set<string>> = {};
    for (const t of teams) next[t.managerId] = new Set();
    setSelections(next);
    setResult(null);
  }

  async function simulate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/keeper-sim/pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections: exportSelections() }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error ?? "Failed to simulate.");
      } else {
        setResult(await res.json());
      }
    } catch {
      setError("Failed to simulate.");
    }
    setLoading(false);
  }

  async function save() {
    if (!name.trim()) {
      setSaveMsg("Name it first.");
      return;
    }
    setSaveMsg("Saving…");
    const res = await fetch("/api/keeper-sim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), selections: exportSelections() }),
    });
    if (res.ok) {
      setSaveMsg("Saved.");
      await refreshSims();
    } else {
      const b = await res.json().catch(() => ({}));
      setSaveMsg(b.error ?? "Couldn't save.");
    }
  }

  function load(sim: SavedSim) {
    const next: Record<string, Set<string>> = {};
    for (const t of teams)
      next[t.managerId] = new Set(sim.selections[t.managerId] ?? []);
    setSelections(next);
    setName(sim.name);
    setResult(null);
    setSaveMsg(`Loaded “${sim.name}”.`);
  }

  async function remove(sim: SavedSim) {
    if (!confirm(`Delete the “${sim.name}” simulation?`)) return;
    const res = await fetch(`/api/keeper-sim/${sim.id}`, { method: "DELETE" });
    if (res.ok) await refreshSims();
  }

  const poolRows: PlayerRow[] = useMemo(
    () =>
      (result?.pool ?? []).map((p) => ({
        playerId: p.playerId,
        playerName: p.playerName,
        keeperCost: p.keeperCost,
        position: p.position,
        team: p.team,
        currentManager: p.currentManager,
        kept: null,
        history: [],
        trades: [],
      })),
    [result]
  );

  return (
    <div>
      {/* Save / load */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name this simulation…"
          className="min-w-[12rem] rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
        />
        <button
          onClick={save}
          className="rounded-md border border-line px-3 py-2 text-sm text-ink hover:bg-surface-2"
        >
          Save
        </button>
        {sims.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted">Saved:</span>
            {sims.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs"
              >
                <button
                  onClick={() => load(s)}
                  className="text-ink hover:text-brand"
                >
                  {s.name}
                </button>
                <button
                  onClick={() => remove(s)}
                  title="Delete"
                  className="text-muted hover:text-rejected"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        {saveMsg && <span className="text-xs text-muted">{saveMsg}</span>}
      </div>

      {/* Simulate controls */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          onClick={simulate}
          disabled={loading || invalidTeams.length > 0}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
        >
          {loading ? "Simulating…" : "Simulate Draft Pool"}
        </button>
        <button
          onClick={clearAll}
          className="text-sm text-muted hover:text-ink"
        >
          Clear all
        </button>
        {invalidTeams.length > 0 && (
          <span className="text-sm text-rejected">
            {invalidTeams.map((t) => t.name).join(", ")}{" "}
            {invalidTeams.length === 1 ? "is" : "are"} over budget — trim keepers
            to simulate.
          </span>
        )}
        {error && <span className="text-sm text-rejected">{error}</span>}
      </div>

      {/* Per-team keeper pickers */}
      <div className="grid gap-3 lg:grid-cols-2">
        {teams.map((t) => {
          const sel = selections[t.managerId] ?? new Set<string>();
          const spend = spendFor(t.managerId);
          const v = validateTeam(t);
          const open = expanded.has(t.managerId);
          return (
            <div
              key={t.managerId}
              className={`self-start rounded-md border bg-surface ${
                v.ok ? "border-line" : "border-rejected/50"
              }`}
            >
              <button
                onClick={() => toggleTeam(t.managerId)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`text-[10px] text-muted transition-transform ${
                      open ? "rotate-90" : ""
                    }`}
                  >
                    ▸
                  </span>
                  <Nameplate alias={t.name} size="sm" />
                </span>
                <span className="tabular text-xs text-muted">
                  {v.emptySpots} to fill · ${spend} ·{" "}
                  <span className={v.ok ? "text-ink" : "text-rejected"}>
                    ${v.remainingBudget} left
                  </span>
                </span>
              </button>
              {!v.ok && (
                <p className="border-t border-line px-4 py-2 text-xs text-rejected">
                  {v.violations[0]}
                </p>
              )}
              {open && (
                <ul className="divide-y divide-line border-t border-line">
                  {t.roster.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-muted">
                      No roster data.
                    </li>
                  ) : (
                    t.roster.map((p) => (
                      <li key={p.playerId}>
                        <label className="flex cursor-pointer items-center gap-2.5 px-4 py-2 text-sm hover:bg-surface-2">
                          <input
                            type="checkbox"
                            checked={sel.has(p.playerId)}
                            onChange={() => toggle(t.managerId, p.playerId)}
                            className="h-4 w-4 accent-[var(--color-brand)]"
                          />
                          <span className="min-w-0 flex-1 truncate text-ink">
                            {p.name}
                          </span>
                          <span className="w-8 shrink-0 text-xs text-muted">
                            {p.position ?? ""}
                          </span>
                          <span className="tabular w-12 shrink-0 text-right text-ink">
                            {p.keeperCost != null ? `$${p.keeperCost}` : "—"}
                          </span>
                        </label>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Results */}
      {result && (
        <section className="mt-10">
          <h2 className="nameplate-type text-lg text-ink">
            Draft pool &amp; remaining budgets
          </h2>
          <p className="mt-1 text-sm text-muted">
            Every fantasy-relevant player not kept in this scenario, and what
            each team would have left to spend.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {result.budgets.map((b) => (
              <div
                key={b.managerId}
                className="rounded-md border border-line bg-surface px-3 py-2"
              >
                <Nameplate alias={b.name} size="sm" />
                <div className="tabular mt-1 text-xs text-muted">
                  <span
                    className={
                      b.remaining < 0 ? "text-rejected" : "text-ink"
                    }
                  >
                    ${b.remaining}
                  </span>{" "}
                  left · {Math.max(0, ROSTER_SIZE - b.keeperCount)} to fill
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <PlayersTable
              players={poolRows}
              keptRevealed={false}
              keeperCostLabel="Last Keeper Cost"
              managerLabel="Last Manager"
              showKept={false}
            />
          </div>
        </section>
      )}
    </div>
  );
}
