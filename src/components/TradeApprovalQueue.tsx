"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Side {
  managerId: string;
  managerName: string;
  playersReceived: string[];
  cashAmount: number | null;
}

interface Trade {
  id: string;
  sides: Side[];
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
    return <p className="mt-2 text-sm text-neutral-500">Nothing pending.</p>;
  }

  return (
    <div className="mt-3 space-y-4">
      {trades.map((t) => (
        <div
          key={t.id}
          className="rounded-md border border-neutral-200 p-4 text-sm dark:border-neutral-800"
        >
          <ul className="space-y-1">
            {t.sides.map((s) => (
              <li key={s.managerId}>
                <span className="font-medium">{s.managerName}</span> receives{" "}
                {s.playersReceived.join(", ") || "—"}
                {s.cashAmount ? (
                  <span className="text-neutral-500">
                    {" "}
                    ({s.cashAmount > 0 ? "+" : ""}
                    {s.cashAmount} cash)
                  </span>
                ) : null}
              </li>
            ))}
          </ul>

          {t.warnings.length > 0 && (
            <div className="mt-3 rounded-md bg-amber-50 p-3 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              {t.warnings.map((w, i) => (
                <p key={i}>⚠ {w}</p>
              ))}
            </div>
          )}

          <div className="mt-3">
            <button
              onClick={() => act(t.id, "approve")}
              disabled={pendingId === t.id}
              className="mr-2 rounded bg-green-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => act(t.id, "reject")}
              disabled={pendingId === t.id}
              className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
