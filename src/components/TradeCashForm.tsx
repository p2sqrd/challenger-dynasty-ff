"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Nameplate } from "./Nameplate";

interface Side {
  managerId: string;
  managerName: string;
  playersReceived: string[];
}

export function TradeCashForm({
  tradeId,
  myManagerId,
  sides,
}: {
  tradeId: string;
  myManagerId: string;
  sides: Side[];
}) {
  const router = useRouter();
  const [cashAmount, setCashAmount] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const mySide = sides.find((s) => s.managerId === myManagerId);
  const otherSides = sides.filter((s) => s.managerId !== myManagerId);

  async function handleSubmit() {
    const amount = Number(cashAmount);
    if (!Number.isInteger(amount)) {
      setError("Enter a whole number.");
      return;
    }
    setSubmitting(true);
    setError("");

    const res = await fetch(`/api/trades/${tradeId}/cash`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cashAmount: amount }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Submission failed.");
      setSubmitting(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="rounded-md border border-line bg-surface p-5 text-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">
            You receive
          </div>
          <div className="mt-1.5 text-ink">
            {mySide?.playersReceived.join(", ") || "—"}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">
            You send
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {otherSides.map((s) => (
              <span key={s.managerId} className="text-ink">
                {s.playersReceived.join(", ") || "—"}
              </span>
            ))}
          </div>
          <div className="mt-1">
            {otherSides.map((s) => (
              <Nameplate key={s.managerId} alias={s.managerName} size="sm" />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <label htmlFor={`cash-${tradeId}`} className="text-muted">
          Cash (negative if you&apos;re paying)
        </label>
        <input
          id={`cash-${tradeId}`}
          type="number"
          value={cashAmount}
          onChange={(e) => setCashAmount(e.target.value)}
          className="tabular w-24 rounded border border-line bg-canvas px-2 py-1 text-ink"
        />
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-md bg-brand px-3 py-1.5 font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </div>
      {error && <p className="mt-2 text-rejected">{error}</p>}
    </div>
  );
}
