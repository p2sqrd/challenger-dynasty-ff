"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FireSaleBidForm({
  saleId,
  minBid,
  maxBid,
  currentBid,
}: {
  saleId: string;
  minBid: number;
  maxBid: number;
  currentBid: number | null;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(currentBid ? String(currentBid) : "");
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState("");

  if (maxBid < minBid) {
    return (
      <p className="text-xs text-muted">
        You can&apos;t bid here — your budget only allows up to ${maxBid}, below
        the ${minBid} minimum.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError("");
    const res = await fetch(`/api/fire-sale/${saleId}/bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount) }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Bid failed.");
      setStatus("idle");
      return;
    }
    setStatus("idle");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">$</span>
      <input
        type="number"
        min={minBid}
        max={maxBid}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={String(minBid)}
        className="tabular w-24 rounded-md border border-line bg-canvas px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
      >
        {status === "saving" ? "…" : currentBid ? "Update bid" : "Place bid"}
      </button>
      <span className="text-xs text-muted">
        min ${minBid} · your max ${maxBid}
        {currentBid ? ` · current $${currentBid}` : ""}
      </span>
      {error && <span className="w-full text-xs text-rejected">{error}</span>}
    </form>
  );
}
