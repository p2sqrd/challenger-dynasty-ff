"use client";

import { PlayerAvatar } from "./PlayerAvatar";
import type { RosterSlot, SlotKind } from "@/lib/roster-slots";

/** Per-position accent, echoing a Sleeper lineup for quick scanning. */
const SLOT_ACCENT: Record<SlotKind, string> = {
  QB: "#FF6B6B",
  RB: "#5DD39E",
  WR: "#4DA8FF",
  TE: "#FF9D4D",
  FLEX: "#C083FF",
  DEF: "#767C89",
  BN: "#767C89",
};

function SlotBadge({ kind, label }: { kind: SlotKind; label: string }) {
  const c = SLOT_ACCENT[kind];
  return (
    <span
      style={{
        backgroundColor: `color-mix(in srgb, ${c} 18%, transparent)`,
        color: c,
      }}
      className="w-12 shrink-0 rounded px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-wide"
    >
      {label}
    </span>
  );
}

function SlotRow({
  slot,
  onRemove,
}: {
  slot: RosterSlot;
  onRemove: (playerId: string) => void;
}) {
  if (!slot.player) {
    return (
      <div className="flex items-center gap-2.5 rounded-md border border-dashed border-line px-2 py-1.5">
        <SlotBadge kind={slot.kind} label={slot.label} />
        <span className="flex-1 text-sm text-muted">Open</span>
      </div>
    );
  }
  const p = slot.player;
  return (
    <button
      onClick={() => onRemove(p.playerId)}
      title="Remove keeper"
      className="group flex w-full items-center gap-2.5 rounded-md border border-line bg-surface px-2 py-1.5 text-left transition-colors hover:border-[color-mix(in_srgb,var(--color-rejected)_50%,transparent)]"
    >
      <SlotBadge kind={slot.kind} label={slot.label} />
      <PlayerAvatar playerId={p.playerId} name={p.name} size={28} />
      <span className="min-w-0 flex-1 truncate text-sm text-ink">{p.name}</span>
      <span className="tabular text-sm font-medium text-ink">${p.newPrice}</span>
      <span className="pointer-events-none w-3 shrink-0 text-xs text-muted opacity-0 transition-opacity group-hover:opacity-100">
        ✕
      </span>
    </button>
  );
}

/**
 * The keeper budget as a roster board: the league's starting slots (QB, RB,
 * RB, WR, WR, WR, TE, FLEX, DEF) on top, then the bench, with each selected
 * keeper slotted into place and every still-open slot showing "Open" — so it
 * reads like your lineup and makes clear what's left to fill in the auction.
 * A budget summary sits up top; clicking a filled slot removes that keeper.
 */
export function BudgetTower({
  budget,
  slots,
  remaining,
  ok,
  onRemove,
}: {
  budget: number;
  slots: RosterSlot[];
  remaining: number;
  ok: boolean;
  onRemove: (playerId: string) => void;
}) {
  const starters = slots.filter((s) => s.kind !== "BN");
  const bench = slots.filter((s) => s.kind === "BN");

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="nameplate-type text-sm text-ink">Roster</span>
        <span className="tabular text-sm text-muted">${budget} cap</span>
      </div>

      <div className="mb-3 rounded-md border border-line bg-canvas p-3 text-center">
        {ok ? (
          <>
            <div className="tabular text-2xl font-semibold text-ink">
              ${remaining}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-muted">
              left for auction
            </div>
          </>
        ) : (
          <div className="text-sm font-semibold text-rejected">Over budget</div>
        )}
      </div>

      <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">
        Starters
      </div>
      <div className="space-y-1">
        {starters.map((slot, i) => (
          <SlotRow key={`${slot.kind}-${i}`} slot={slot} onRemove={onRemove} />
        ))}
      </div>

      <div className="mb-1 mt-3 text-[10px] uppercase tracking-wide text-muted">
        Bench
      </div>
      <div className="space-y-1">
        {bench.map((slot, i) => (
          <SlotRow key={`BN-${i}`} slot={slot} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}
