"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";

interface AuctionState {
  status: "active" | "accepted" | "rejected" | "cancelled";
  deadline: string;
  minBid: number;
  high: { amount: number; bidderName: string } | null;
  myCap: number;
  isSeller: boolean;
  watching: string[];
  sellerName: string;
  winnerName: string | null;
}

// A shared 1s clock read through useSyncExternalStore (lint-clean; null on the
// server so SSR and first paint agree).
let clockNow = Date.now();
function subscribe(cb: () => void) {
  const id = setInterval(() => {
    clockNow = Date.now();
    cb();
  }, 1000);
  return () => clearInterval(id);
}
function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => clockNow,
    () => null
  );
}

// Human-readable countdown: show the two largest relevant units, so a
// far-off auction reads "4w 2d" and the final stretch counts down "5m 12s"
// then "9s" — always surfacing seconds once it's under an hour (the last
// minute is where the anti-snipe rule matters).
function fmt(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const w = Math.floor(total / 604800);
  const d = Math.floor((total % 604800) / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (w > 0) return `${w}w ${d}d`;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function LiveAuction({ saleId }: { saleId: string }) {
  const now = useNow();
  const [state, setState] = useState<AuctionState | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch(`/api/fire-sale/${saleId}/state`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const d = (await res.json()) as AuctionState;
        if (!cancelled) setState(d);
      } catch {
        /* transient — next poll retries */
      }
    }
    refresh();
    const poll = setInterval(refresh, 2000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [saleId]);

  async function placeBid(value: number) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/fire-sale/${saleId}/bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: value }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Bid failed.");
    } else {
      setAmount("");
      const r = await fetch(`/api/fire-sale/${saleId}/state`, {
        cache: "no-store",
      });
      if (r.ok) setState((await r.json()) as AuctionState);
    }
    setBusy(false);
  }

  if (!state) {
    return <p className="text-sm text-muted">Connecting to the auction…</p>;
  }

  const deadlineMs = new Date(state.deadline).getTime();
  const remaining = now === null ? null : deadlineMs - now;
  const ended = remaining !== null && remaining <= 0;
  const live = state.status === "active" && !ended;

  const highAmount = state.high?.amount ?? 0;
  const nextMin = state.high ? highAmount + 1 : state.minBid;

  return (
    <div className="rounded-md border border-line bg-surface p-5">
      {/* Clock + high bid */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">
            Current high bid
          </div>
          <div className="tabular mt-1 text-4xl font-semibold text-ink">
            {state.high ? `$${state.high.amount}` : `$${state.minBid} minimum`}
          </div>
          <div className="mt-1 text-sm text-muted">
            {state.high ? `by ${state.high.bidderName}` : "no bids yet"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-muted">
            {live ? "Time left" : "Auction"}
          </div>
          <div
            className={`tabular mt-1 text-3xl font-semibold ${
              live && remaining !== null && remaining <= 10000
                ? "text-gold"
                : "text-ink"
            }`}
          >
            {ended ? "Ended" : remaining === null ? "—" : fmt(remaining)}
          </div>
        </div>
      </div>

      {/* Bidding */}
      <div className="mt-5 border-t border-line pt-4">
        {state.status !== "active" ? (
          <p className="text-sm text-muted">
            This auction is {state.status}.
          </p>
        ) : ended ? (
          <p className="text-sm text-ink">
            Bidding is over.{" "}
            {state.high
              ? `High bid: $${state.high.amount} by ${state.high.bidderName}.`
              : "No bids came in."}{" "}
            {state.sellerName} confirms the result on the{" "}
            <Link href="/fire-sale" className="text-brand hover:underline">
              Fire Sale page
            </Link>
            .
          </p>
        ) : state.isSeller ? (
          <p className="text-sm text-muted">
            Your auction — sit back and watch the bids climb.
          </p>
        ) : state.myCap < nextMin ? (
          <p className="text-sm text-muted">
            You can&apos;t bid — your max is ${state.myCap}, below the ${nextMin}{" "}
            needed next.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => placeBid(nextMin)}
              disabled={busy}
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
            >
              Bid ${nextMin}
            </button>
            <span className="text-xs text-muted">or</span>
            <input
              type="number"
              min={nextMin}
              max={state.myCap}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`${nextMin}–${state.myCap}`}
              className="tabular w-28 rounded-md border border-line bg-canvas px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
            />
            <button
              onClick={() => amount && placeBid(Number(amount))}
              disabled={busy || !amount}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-2 disabled:opacity-40"
            >
              Bid
            </button>
            <span className="text-xs text-muted">your max ${state.myCap}</span>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-rejected">{error}</p>}
      </div>

      {/* Presence */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <span className="inline-block h-2 w-2 rounded-full bg-approved" />
        Watching now: {state.watching.length > 0 ? state.watching.join(", ") : "just you"}
      </div>
    </div>
  );
}
