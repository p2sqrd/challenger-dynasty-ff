"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Pull new trades from Sleeper on demand. Available to any manager. */
export function SyncTradesButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);

  async function sync() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/trades/sync", { method: "POST" });
    const b = (await res.json().catch(() => ({}))) as {
      imported?: number;
      error?: string;
    };
    setBusy(false);
    if (!res.ok) {
      setIsError(true);
      setMsg(b.error ?? "Sync failed.");
      return;
    }
    setIsError(false);
    const n = b.imported ?? 0;
    setMsg(
      n > 0
        ? `Imported ${n} new trade${n === 1 ? "" : "s"}.`
        : "Up to date — no new trades."
    );
    if (n > 0) router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={sync}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
      >
        <span aria-hidden className={busy ? "animate-spin" : ""}>
          ↻
        </span>
        {busy ? "Syncing…" : "Sync from Sleeper"}
      </button>
      {msg && (
        <span className={`text-xs ${isError ? "text-rejected" : "text-muted"}`}>
          {msg}
        </span>
      )}
    </div>
  );
}
