"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { resolveTeam } from "@/lib/teams";

interface ManagerOption {
  id: string;
  display_name: string;
}

interface SideState {
  managerId: string;
  players: string;
  cash: string;
}

const emptySide: SideState = { managerId: "", players: "", cash: "0" };

/**
 * Commissioner-only form to author a trade by hand (no Sleeper import). Two
 * sides by default, with the option to add a third team. On submit it creates
 * a pending-approval trade that the commissioner then approves from the queue
 * below, so it uses the same budget-ledger path as a synced trade.
 */
export function ManualTradeForm({
  seasonId,
  managers,
}: {
  seasonId: string;
  managers: ManagerOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sides, setSides] = useState<SideState[]>([
    { ...emptySide },
    { ...emptySide },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const options = managers
    .map((m) => ({ id: m.id, name: resolveTeam(m.display_name).name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  function setSide(i: number, patch: Partial<SideState>) {
    setSides((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function reset() {
    setSides([{ ...emptySide }, { ...emptySide }]);
    setError("");
  }

  async function submit() {
    setError("");
    const payloadSides = sides.map((s) => ({
      managerId: s.managerId,
      players: s.players
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean),
      cashAmount: Number(s.cash || "0"),
    }));

    if (payloadSides.some((s) => !s.managerId)) {
      setError("Pick a manager for every side.");
      return;
    }
    if (payloadSides.some((s) => !Number.isInteger(s.cashAmount))) {
      setError("Cash must be a whole number (negative if paying).");
      return;
    }
    if (
      new Set(payloadSides.map((s) => s.managerId)).size !== payloadSides.length
    ) {
      setError("Each manager can only appear once.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/trades/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonId, sides: payloadSides }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not create trade.");
      return;
    }
    reset();
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-brand hover:bg-surface-2"
      >
        + Create a trade
      </button>
    );
  }

  return (
    <div className="rounded-md border border-line bg-surface p-5">
      <div className="space-y-4">
        {sides.map((side, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <select
              value={side.managerId}
              onChange={(e) => setSide(i, { managerId: e.target.value })}
              className="rounded border border-line bg-canvas px-2 py-1.5 text-sm text-ink"
            >
              <option value="">Manager…</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={side.players}
              onChange={(e) => setSide(i, { players: e.target.value })}
              placeholder="Players received (comma-separated)"
              className="rounded border border-line bg-canvas px-2 py-1.5 text-sm text-ink placeholder:text-muted"
            />
            <input
              type="number"
              value={side.cash}
              onChange={(e) => setSide(i, { cash: e.target.value })}
              title="Cash (negative if paying)"
              className="tabular w-24 rounded border border-line bg-canvas px-2 py-1.5 text-sm text-ink"
            />
          </div>
        ))}
      </div>

      {sides.length < 3 && (
        <button
          onClick={() => setSides((prev) => [...prev, { ...emptySide }])}
          className="mt-3 text-xs text-brand hover:underline"
        >
          + add a third team
        </button>
      )}

      {error && <p className="mt-3 text-sm text-rejected">{error}</p>}

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-[var(--color-brand-ink)] disabled:opacity-40"
        >
          {submitting ? "Creating…" : "Create trade"}
        </button>
        <button
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-sm text-muted hover:text-ink"
        >
          Cancel
        </button>
        <span className="ml-auto text-xs text-muted">
          Lands in Pending approval below.
        </span>
      </div>
    </div>
  );
}
