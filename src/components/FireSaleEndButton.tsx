"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Seller ends their Fire Sale early. Confirms, then closes bidding so the
 * sealed offers unseal and the resolve panel appears. No new bids after this.
 */
export function FireSaleEndButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function end() {
    if (
      !confirm(
        "End this auction now? Bids will be unsealed and no new bids can come in."
      )
    )
      return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/fire-sale/${saleId}/end`, { method: "POST" });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Failed.");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button
        onClick={end}
        disabled={busy}
        className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
      >
        {busy ? "Ending…" : "End auction & see bids"}
      </button>
      {error && <p className="mt-1 text-sm text-rejected">{error}</p>}
    </>
  );
}
