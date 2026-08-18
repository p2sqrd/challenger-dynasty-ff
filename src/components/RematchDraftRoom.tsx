"use client";

import { useCallback, useEffect, useState } from "react";
import { Nameplate } from "./Nameplate";
import { PageHeader } from "./PageHeader";
import type { DraftStateView } from "@/lib/rematch-load";

const POLL_MS = 3000;

export function RematchDraftRoom({
  initial,
  myManagerId,
}: {
  initial: DraftStateView;
  myManagerId: string | null;
}) {
  const [state, setState] = useState<DraftStateView>(initial);
  const [selectedWeek, setSelectedWeek] = useState<number>(initial.weeks[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchState = useCallback(async (): Promise<DraftStateView | null> => {
    try {
      const res = await fetch(`/api/rematch-draft/${initial.id}/state`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      return (await res.json()) as DraftStateView;
    } catch {
      return null; // Transient — the next poll retries.
    }
  }, [initial.id]);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const next = await fetchState();
      if (next && !cancelled) setState(next);
    }
    tick();
    const poll = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [fetchState]);

  async function refresh() {
    const next = await fetchState();
    if (next) setState(next);
  }

  // The team on the clock may have nothing open in the tab you last chose, so
  // the selected week is derived rather than corrected after the fact.
  const openWeeks = state.legal.filter((p) => p.ok).map((p) => p.week);
  const week = openWeeks.includes(selectedWeek)
    ? selectedWeek
    : openWeeks[0] ?? selectedWeek;

  async function submit(opponentManagerId: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/rematch-draft/${initial.id}/pick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentManagerId, week }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) setError(body.error ?? "That pick didn't go through.");
    } catch {
      setError("That pick didn't go through.");
    } finally {
      setBusy(false);
      await refresh();
    }
  }

  const legalThisWeek = state.legal.filter((p) => p.week === week);
  const byWeekOptions = state.weeks.map((w) => ({
    week: w,
    count: state.legal.filter((p) => p.week === w && p.ok).length,
  }));

  return (
    <div>
      <PageHeader
        title={state.label}
        subtitle="Pick an opponent and a week. Each pick fills that week for both teams, so a team with all three weeks set is skipped when its turn comes around. A week left with only one legal opponent is assigned automatically rather than costing anyone a pick."
        right={
          <span className="tabular text-sm text-muted">
            {state.made} / {state.total} matchups
          </span>
        }
      />

      <section className="mb-6 rounded-md border border-line bg-surface p-5">
        {state.complete ? (
          <p className="nameplate-type text-2xl text-ink">Draft complete</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-wide text-muted">
              On the clock
            </span>
            {state.onTheClockAlias && (
              <Nameplate alias={state.onTheClockAlias} size="lg" />
            )}
            <span className="tabular text-sm text-muted">
              pick {state.made + 1}
            </span>
          </div>
        )}

        {state.canPick && !state.complete && (
          <div className="mt-5 border-t border-line pt-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {byWeekOptions.map((o) => (
                <button
                  key={o.week}
                  type="button"
                  onClick={() => setSelectedWeek(o.week)}
                  disabled={o.count === 0}
                  className={`rounded-md border px-4 py-2 text-sm transition-opacity disabled:opacity-30 ${
                    week === o.week
                      ? "border-brand bg-brand/10 text-ink"
                      : "border-line text-muted hover:text-ink"
                  }`}
                >
                  Week {o.week}
                  <span className="tabular ml-2 text-xs text-muted">
                    {o.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {legalThisWeek.map((p) => (
                <button
                  key={p.opponentManagerId}
                  type="button"
                  title={p.ok ? undefined : p.reason}
                  disabled={!p.ok || busy}
                  onClick={() => submit(p.opponentManagerId)}
                  className={`flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-opacity ${
                    p.ok
                      ? "border-line bg-canvas hover:border-brand"
                      : "cursor-not-allowed border-line/50 opacity-40"
                  }`}
                >
                  <Nameplate
                    alias={
                      state.teams.find((t) => t.managerId === p.opponentManagerId)
                        ?.alias ?? "—"
                    }
                    size="sm"
                  />
                  <span className="text-xs text-muted">
                    {p.ok ? `Play in Week ${p.week}` : p.reason}
                  </span>
                </button>
              ))}
            </div>

            {error && <p className="mt-3 text-sm text-rejected">{error}</p>}
          </div>
        )}

        {!state.canPick && !state.complete && (
          <p className="mt-3 text-sm text-muted">
            {state.actingAsId === myManagerId
              ? "Waiting on the team on the clock. The board updates on its own."
              : "You're watching this draft."}
          </p>
        )}
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        {state.byWeek.map(({ week: w, matchups }) => (
          <div key={w} className="rounded-md border border-line bg-surface p-4">
            <h2 className="mb-3 text-xs uppercase tracking-wide text-muted">
              Week {w}
              <span className="tabular ml-2">
                {matchups.length} / {state.teams.length / 2}
              </span>
            </h2>
            <ul className="flex flex-col gap-2">
              {matchups.map((m) => (
                <li
                  key={`${m.week}-${m.pickerId}-${m.opponentId}`}
                  className="flex items-center justify-between gap-2 rounded-md bg-canvas px-3 py-2"
                >
                  <span className="flex flex-col gap-1">
                    <Nameplate alias={m.pickerAlias} size="sm" />
                    <Nameplate alias={m.opponentAlias} size="sm" />
                  </span>
                  <span
                    className="tabular text-xs text-muted"
                    title={
                      m.auto
                        ? "Only legal matchup left — assigned automatically."
                        : undefined
                    }
                  >
                    {m.auto ? "auto" : `#${m.pickNumber}`}
                  </span>
                </li>
              ))}
              {matchups.length === 0 && (
                <li className="text-sm text-muted">Nothing drafted yet.</li>
              )}
            </ul>
          </div>
        ))}
      </section>

      <section className="rounded-md border border-line bg-surface p-4">
        <h2 className="mb-3 text-xs uppercase tracking-wide text-muted">
          Draft order — reverse playoff finish, snaking back each round
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[...state.teams]
            // Round 1 order: 7th → 12th, then 6th → 1st.
            .sort((a, b) => {
              const key = (finish: number) =>
                finish > state.teams.length / 2 ? finish : 1000 - finish;
              return key(a.finish) - key(b.finish);
            })
            .map((t) => (
              <li
                key={t.managerId}
                className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 ${
                  t.managerId === state.onTheClockId
                    ? "bg-brand/10 ring-1 ring-brand"
                    : "bg-canvas"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="tabular text-xs text-muted">{t.finish}</span>
                  <Nameplate alias={t.alias} size="sm" />
                </span>
                <span className="tabular text-xs text-muted">
                  {t.weeksOpen.length === 0
                    ? "set"
                    : `${t.weeksOpen.length} left`}
                </span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
