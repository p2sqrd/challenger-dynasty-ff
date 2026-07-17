"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FireSaleForm({
  rosterPlayers,
}: {
  rosterPlayers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState("");
  const [mode, setMode] = useState<"private" | "public">("private");
  const [minBid, setMinBid] = useState("1");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerId) return setError("Pick a player.");
    if (!deadline) return setError("Pick a deadline.");
    setStatus("saving");
    setError("");

    const res = await fetch("/api/fire-sale/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        mode,
        minBid: Number(minBid) || 1,
        deadline: new Date(deadline).toISOString(),
      }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Could not start the sale.");
      setStatus("idle");
      return;
    }
    setPlayerId("");
    setMinBid("1");
    setDeadline("");
    setStatus("idle");
    router.refresh();
  }

  const field =
    "rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none [color-scheme:dark]";

  return (
    <form onSubmit={submit} className="rounded-md border border-line bg-surface p-5">
      <div className="mb-4 flex gap-2">
        {(["private", "public"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              mode === m
                ? "border-brand text-brand"
                : "border-line text-muted hover:text-ink"
            }`}
          >
            {m === "private" ? "Private (sealed bids)" : "Public (live auction)"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 sm:col-span-3">
          <span className="text-xs uppercase tracking-wide text-muted">Player</span>
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className={field}
          >
            <option value="">Select one of your players…</option>
            {rosterPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">
            Minimum bid ($)
          </span>
          <input
            type="number"
            min={1}
            value={minBid}
            onChange={(e) => setMinBid(e.target.value)}
            className={`tabular ${field}`}
          />
        </label>

        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs uppercase tracking-wide text-muted">
            {mode === "public" ? "Auction ends" : "Bids close"}
          </span>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={field}
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
        >
          {status === "saving" ? "Starting…" : "Start Fire Sale"}
        </button>
        <span className="text-xs text-muted">
          {mode === "public"
            ? "Live ascending auction — everyone sees bids; a bid in the last 10s adds 10s."
            : "Sealed bids — nobody sees others' offers until you review them."}
        </span>
      </div>
      {error && <p className="mt-2 text-sm text-rejected">{error}</p>}
    </form>
  );
}
