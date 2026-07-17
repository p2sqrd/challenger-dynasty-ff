"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Bid {
  bidderId: string;
  bidderName: string;
  amount: number;
}

export function FireSaleResolve({
  saleId,
  bids,
}: {
  saleId: string;
  bids: Bid[];
}) {
  const router = useRouter();
  const sorted = [...bids].sort((a, b) => b.amount - a.amount);
  const top = sorted[0]?.amount ?? 0;
  const topBidders = sorted.filter((b) => b.amount === top);

  const [winnerId, setWinnerId] = useState(
    topBidders.length === 1 ? topBidders[0].bidderId : ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function post(path: string, body?: object) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/fire-sale/${saleId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Failed.");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  if (bids.length === 0) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted">No bids came in.</p>
        <button
          onClick={() => post("reject")}
          disabled={busy}
          className="rounded-md border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-2 disabled:opacity-40"
        >
          Close it out
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wide text-muted">
        Sealed bids {topBidders.length > 1 ? "· tie at the top — you pick" : ""}
      </p>
      <ul className="divide-y divide-line rounded-md border border-line">
        {sorted.map((b) => {
          const isTop = b.amount === top;
          return (
            <li key={b.bidderId} className="flex items-center gap-3 px-3 py-2">
              <input
                type="radio"
                name={`winner-${saleId}`}
                checked={winnerId === b.bidderId}
                disabled={!isTop}
                onChange={() => setWinnerId(b.bidderId)}
                className="h-4 w-4 accent-[var(--color-brand)] disabled:opacity-30"
              />
              <span className="flex-1 text-sm text-ink">{b.bidderName}</span>
              <span className="tabular text-sm font-medium text-ink">
                ${b.amount}
              </span>
              {isTop && (
                <span className="rounded bg-canvas px-1.5 py-0.5 text-[10px] uppercase text-gold">
                  high
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => winnerId && post("accept", { winnerId })}
          disabled={busy || !winnerId}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
        >
          Accept &amp; send to commissioner
        </button>
        <button
          onClick={() => post("reject")}
          disabled={busy}
          className="rounded-md border border-line px-3 py-2 text-sm text-ink hover:bg-surface-2 disabled:opacity-40"
        >
          Reject all
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-rejected">{error}</p>}
    </div>
  );
}
