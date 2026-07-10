"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TradeSidesView, type TradeSideView } from "./TradeSides";

interface Trade {
  id: string;
  sides: TradeSideView[];
  warnings: string[];
}

export function TradeApprovalQueue({ trades }: { trades: Trade[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "reject") {
    setPendingId(id);
    await fetch(`/api/trades/${id}/${action}`, { method: "POST" });
    setPendingId(null);
    router.refresh();
  }

  if (trades.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted">
        Nothing pending — trades land here once both sides enter their cash.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-4">
      {trades.map((t) => (
        <div
          key={t.id}
          className="rounded-md border border-line bg-surface p-5"
        >
          <TradeSidesView sides={t.sides} />

          {t.warnings.length > 0 && (
            <div className="mt-4 rounded-md border border-[rgba(232,163,61,0.35)] bg-[rgba(232,163,61,0.10)] p-3 text-sm text-pending">
              {t.warnings.map((w, i) => (
                <p key={i}>⚠ {w}</p>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
            <button
              onClick={() => act(t.id, "approve")}
              disabled={pendingId === t.id}
              className="rounded-md bg-[rgba(76,175,109,0.14)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-approved transition-colors hover:bg-[rgba(76,175,109,0.24)] disabled:opacity-40"
            >
              Approve
            </button>
            <button
              onClick={() => act(t.id, "reject")}
              disabled={pendingId === t.id}
              className="rounded-md bg-[rgba(229,72,77,0.14)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-rejected transition-colors hover:bg-[rgba(229,72,77,0.24)] disabled:opacity-40"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
