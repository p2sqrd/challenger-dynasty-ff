"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ChipSide {
  name: string;
  players: string[];
  /** Signed cash for this side (positive = received). */
  cash: number | null;
}

/**
 * A budget trade chip (+/−$X) with a hover tooltip describing the trade. Real
 * app-processed trades show who received which players (and cash); seeded
 * spreadsheet figures only have the amount. The tooltip is portaled to the
 * body and fixed-positioned so the table's horizontal scroll doesn't clip it.
 */
export function BudgetChip({
  amount,
  sides,
}: {
  amount: number;
  sides: ChipSide[] | null;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);

  const positive = amount >= 0;
  const money = `${positive ? "+" : "−"}$${Math.abs(amount)}`;

  function show() {
    const r = ref.current?.getBoundingClientRect();
    if (r) setTip({ top: r.top, left: r.left + r.width / 2 });
  }

  const tooltip = tip && (
    <div
      style={{
        position: "fixed",
        top: tip.top - 8,
        left: tip.left,
        transform: "translate(-50%, -100%)",
      }}
      className="pointer-events-none z-50 w-max max-w-[16rem] rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-lg"
    >
      {sides ? (
        <div className="space-y-1">
          {sides.map((s, i) => {
            const got = [
              ...s.players,
              s.cash && s.cash > 0 ? `$${s.cash} cash` : null,
            ].filter(Boolean);
            return (
              <div key={i}>
                <span className="font-medium text-ink">{s.name}</span>
                <span className="text-muted"> got </span>
                <span className="text-ink">{got.join(", ") || "—"}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-muted">
          <span className="tabular text-ink">{money}</span> · Only 2026 trade
          data is available.
        </div>
      )}
    </div>
  );

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={() => setTip(null)}
      className={`tabular cursor-default rounded px-1.5 py-0.5 text-xs ${
        positive ? "bg-approved/10 text-approved" : "bg-rejected/10 text-rejected"
      }`}
    >
      {money}
      {tip ? createPortal(tooltip, document.body) : null}
    </span>
  );
}
