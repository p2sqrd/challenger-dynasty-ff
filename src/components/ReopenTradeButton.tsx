"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReopenTradeButton({ tradeId }: { tradeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function reopen() {
    setBusy(true);
    const res = await fetch(`/api/trades/${tradeId}/reopen`, {
      method: "POST",
    });
    setBusy(false);
    if (res.ok) {
      setConfirming(false);
      router.refresh();
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs text-muted hover:text-ink"
      >
        Edit
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="text-xs text-muted">
        This will undo the approval and move the trade back to the queue.
      </span>
      <button
        onClick={reopen}
        disabled={busy}
        className="shrink-0 rounded-md bg-[rgba(229,72,77,0.14)] px-2 py-1 text-xs font-semibold text-rejected hover:bg-[rgba(229,72,77,0.24)] disabled:opacity-40"
      >
        {busy ? "Reopening..." : "Confirm"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="text-xs text-muted hover:text-ink"
      >
        Cancel
      </button>
    </span>
  );
}
