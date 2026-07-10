"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <div className="rounded-md border border-neutral-200 p-4 text-sm dark:border-neutral-800">
      <p>
        You receive: {mySide?.playersReceived.join(", ") || "—"}
      </p>
      <p className="mt-1 text-neutral-500">
        You send: {otherSides.flatMap((s) => s.playersReceived).join(", ") || "—"}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <label htmlFor={`cash-${tradeId}`} className="text-neutral-500">
          Cash (negative if you&apos;re paying):
        </label>
        <input
          id={`cash-${tradeId}`}
          type="number"
          value={cashAmount}
          onChange={(e) => setCashAmount(e.target.value)}
          className="w-20 rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-md bg-neutral-900 px-3 py-1 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </div>
  );
}
