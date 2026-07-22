"use client";

import { useMemo, useState } from "react";
import { validateKeeperRoster, ROSTER_SIZE } from "@/lib/rules/budget-validation";

export interface SimPlayer {
  playerId: string;
  name: string;
  /** Cost to keep this player next year; null if we don't have a prior price. */
  keeperPrice: number | null;
}

export interface SimRoster {
  managerId: string;
  name: string;
  /** This manager's pre-trade auction budget (base + cash trades). */
  auctionBudget: number;
  roster: SimPlayer[];
}

const listBox =
  "max-h-56 overflow-y-auto rounded-md border border-line bg-canvas p-1";
const rowBase =
  "flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-2";

/**
 * One side's keeper try-out: pick keepers off a (post-trade) roster and see
 * the spend, dollars left, and roster-fill math. Purely presentational.
 */
function KeeperPanel({
  title,
  roster,
  selected,
  onToggle,
  budget,
  rosterSize,
}: {
  title: string;
  roster: SimPlayer[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  budget: number;
  rosterSize: number;
}) {
  const active = roster.filter((p) => selected.has(p.playerId));
  const spend = active.reduce((s, p) => s + (p.keeperPrice ?? 0), 0);
  const validation = validateKeeperRoster({
    startingBudget: budget,
    totalKeeperSpend: spend,
    keeperCount: active.length,
    rosterSize,
  });

  return (
    <div>
      <div className="mb-1 text-sm font-medium text-ink">{title}</div>
      <div className={listBox}>
        {roster.map((p) => {
          const keepable = p.keeperPrice != null;
          return (
            <label
              key={p.playerId}
              className={`${rowBase} justify-between ${
                keepable ? "" : "cursor-not-allowed opacity-60"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled={!keepable}
                  checked={selected.has(p.playerId)}
                  onChange={() => onToggle(p.playerId)}
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                <span className="text-ink">{p.name}</span>
              </span>
              <span className="tabular text-xs text-muted">
                {keepable ? `$${p.keeperPrice}` : "no keeper price"}
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
        <span className="text-muted">
          Keeping <span className="tabular text-ink">{active.length}</span> for{" "}
          <span className="tabular text-ink">${spend}</span>
        </span>
        <span className="text-muted">
          Auction $ left{" "}
          <span
            className={`tabular font-semibold ${
              validation.ok ? "text-ink" : "text-rejected"
            }`}
          >
            ${validation.remainingBudget}
          </span>{" "}
          for {validation.emptySpots} spots
        </span>
      </div>
      {!validation.ok && (
        <p className="mt-2 text-sm text-rejected">{validation.violations[0]}</p>
      )}
    </div>
  );
}

/**
 * A client-side "what-if" trade tool: pick a partner, move players + cash, and
 * see both sides' resulting rosters, auction budgets, and keeper math. Nothing
 * is saved.
 */
export function TradeSimulator({
  me,
  others,
  rosterSize = ROSTER_SIZE,
}: {
  me: SimRoster;
  others: SimRoster[];
  rosterSize?: number;
}) {
  const [open, setOpen] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [send, setSend] = useState<Set<string>>(new Set());
  const [receive, setReceive] = useState<Set<string>>(new Set());
  const [cash, setCash] = useState("0");
  const [keepers, setKeepers] = useState<Set<string>>(new Set());
  const [partnerKeepers, setPartnerKeepers] = useState<Set<string>>(new Set());

  const partner = others.find((o) => o.managerId === partnerId) ?? null;

  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>) {
    return (id: string) =>
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
  }
  const toggleSend = toggle(setSend);
  const toggleReceive = toggle(setReceive);
  const toggleKeeper = toggle(setKeepers);
  const togglePartnerKeeper = toggle(setPartnerKeepers);

  function reset() {
    setPartnerId("");
    setSend(new Set());
    setReceive(new Set());
    setCash("0");
    setKeepers(new Set());
    setPartnerKeepers(new Set());
  }

  // Post-trade roster: your players minus who you sent, plus who you got.
  const newRoster: SimPlayer[] = useMemo(() => {
    const kept = me.roster.filter((p) => !send.has(p.playerId));
    const gained = partner
      ? partner.roster.filter((p) => receive.has(p.playerId))
      : [];
    return [...kept, ...gained].sort((a, b) => a.name.localeCompare(b.name));
  }, [me.roster, send, partner, receive]);

  // The partner's mirror-image post-trade roster: their players minus what
  // they sent you (what you receive), plus what they got from you (what you
  // send).
  const partnerNewRoster: SimPlayer[] = useMemo(() => {
    if (!partner) return [];
    const kept = partner.roster.filter((p) => !receive.has(p.playerId));
    const gained = me.roster.filter((p) => send.has(p.playerId));
    return [...kept, ...gained].sort((a, b) => a.name.localeCompare(b.name));
  }, [partner, receive, me.roster, send]);

  // Cash is entered from your point of view: positive means you *receive* it
  // (your budget goes up, the partner's goes down), negative means you send it.
  const cashNum = Number.isFinite(Number(cash)) ? Math.trunc(Number(cash)) : 0;
  const newBudget = me.auctionBudget + cashNum;
  const partnerNewBudget = partner ? partner.auctionBudget - cashNum : 0;

  const changed =
    partnerId !== "" || send.size > 0 || receive.size > 0 || cashNum !== 0;

  if (!open) {
    return (
      <section className="mt-12">
        <h2 className="nameplate-type text-lg text-ink">Trade Simulator</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          A private what-if tool — pick a partner, move players and cash, and see
          how your roster, budget, and keepers would look. Nothing is saved.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-[var(--color-brand-ink)]"
        >
          Start a simulation
        </button>
      </section>
    );
  }

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between">
        <h2 className="nameplate-type text-lg text-ink">Trade Simulator</h2>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-sm text-muted hover:text-ink"
        >
          Close
        </button>
      </div>

      <div className="mt-3 space-y-6 rounded-md border border-line bg-surface p-5">
        {/* 1. Partner */}
        <div>
          <div className="mb-1.5 text-xs uppercase tracking-wide text-muted">
            1 · Trade with
          </div>
          <select
            value={partnerId}
            onChange={(e) => {
              setPartnerId(e.target.value);
              setReceive(new Set());
              setPartnerKeepers(new Set());
            }}
            className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none sm:w-72"
          >
            <option value="">Pick a manager…</option>
            {others.map((o) => (
              <option key={o.managerId} value={o.managerId}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        {partner && (
          <>
            {/* 2. Players + cash */}
            <div>
              <div className="mb-1.5 text-xs uppercase tracking-wide text-muted">
                2 · Players &amp; cash
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-sm font-medium text-ink">
                    You send
                  </div>
                  <div className={listBox}>
                    {me.roster.map((p) => (
                      <label key={p.playerId} className={rowBase}>
                        <input
                          type="checkbox"
                          checked={send.has(p.playerId)}
                          onChange={() => toggleSend(p.playerId)}
                          className="h-4 w-4 accent-[var(--color-rejected)]"
                        />
                        <span className="text-ink">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-ink">
                    You receive from {partner.name}
                  </div>
                  <div className={listBox}>
                    {partner.roster.map((p) => (
                      <label key={p.playerId} className={rowBase}>
                        <input
                          type="checkbox"
                          checked={receive.has(p.playerId)}
                          onChange={() => toggleReceive(p.playerId)}
                          className="h-4 w-4 accent-[var(--color-approved)]"
                        />
                        <span className="text-ink">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted">Cash you receive (negative if you send)</span>
                <input
                  type="number"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  className="tabular w-24 rounded border border-line bg-canvas px-2 py-1 text-ink"
                />
              </label>
            </div>

            {/* 3. Result */}
            <div className="rounded-md border border-line bg-canvas p-4">
              <div className="mb-2 text-xs uppercase tracking-wide text-muted">
                3 · After the trade
              </div>
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
                <span className="text-muted">
                  Auction budget{" "}
                  <span className="tabular text-ink">${newBudget}</span>
                  {cashNum !== 0 && (
                    <span
                      className={`tabular ml-1 text-xs ${
                        cashNum > 0 ? "text-approved" : "text-rejected"
                      }`}
                    >
                      ({cashNum > 0 ? "+" : "−"}${Math.abs(cashNum)} cash)
                    </span>
                  )}
                </span>
                <span className="text-muted">
                  Roster{" "}
                  <span className="tabular text-ink">{newRoster.length}</span>{" "}
                  players
                </span>
              </div>
            </div>

            {/* 4. Keepers — both sides */}
            <div>
              <div className="mb-1.5 text-xs uppercase tracking-wide text-muted">
                4 · Try keepers
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <KeeperPanel
                  title="Your keepers"
                  roster={newRoster}
                  selected={keepers}
                  onToggle={toggleKeeper}
                  budget={newBudget}
                  rosterSize={rosterSize}
                />
                <KeeperPanel
                  title={`${partner.name}'s keepers`}
                  roster={partnerNewRoster}
                  selected={partnerKeepers}
                  onToggle={togglePartnerKeeper}
                  budget={partnerNewBudget}
                  rosterSize={rosterSize}
                />
              </div>
            </div>
          </>
        )}

        <div className="flex items-center gap-3 border-t border-line pt-4">
          <button
            type="button"
            onClick={reset}
            disabled={!changed && keepers.size === 0 && partnerKeepers.size === 0}
            className="rounded-md border border-line px-4 py-2 text-sm text-ink transition-colors hover:bg-surface-2 disabled:opacity-40"
          >
            Reset
          </button>
          <span className="text-xs text-muted">
            Simulation only — nothing here is saved or sent to anyone.
          </span>
        </div>
      </div>
    </section>
  );
}
