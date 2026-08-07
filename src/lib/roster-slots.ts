/**
 * The league's starting lineup + bench layout, straight from Sleeper's
 * roster_positions for this league: QB, RB, RB, WR, WR, WR, TE, FLEX, DEF,
 * then 7 bench. Kept here as a constant (single, stable league) rather than
 * fetched per render.
 */
export type SlotKind = "QB" | "RB" | "WR" | "TE" | "FLEX" | "DEF" | "BN";

export const ROSTER_SLOTS: SlotKind[] = [
  "QB",
  "RB",
  "RB",
  "WR",
  "WR",
  "WR",
  "TE",
  "FLEX",
  "DEF",
  "BN",
  "BN",
  "BN",
  "BN",
  "BN",
  "BN",
  "BN",
];

/** Positions the FLEX (W/R/T) slot accepts. */
const FLEX_POSITIONS = new Set(["RB", "WR", "TE"]);

export interface SlottablePlayer {
  playerId: string;
  name: string;
  newPrice: number;
  /** Sleeper position (QB/RB/WR/TE/DEF/…), or null if unknown. */
  position: string | null;
}

export interface RosterSlot {
  kind: SlotKind;
  /** Short display label for the slot badge. */
  label: string;
  /** The keeper filling this slot, or null when it's still open. */
  player: SlottablePlayer | null;
}

function labelFor(kind: SlotKind): string {
  return kind === "FLEX" ? "W/R/T" : kind;
}

/**
 * Slot keepers into the league's roster, greedily and in the order given
 * (selection order): each keeper takes the first open dedicated starting slot
 * for its position, then FLEX if it's RB/WR/TE, then the bench. Starters fill
 * before the bench. Unknown positions fall to the bench. If somehow more
 * keepers than slots come in, extra bench rows are appended so none are hidden.
 */
export function assignRosterSlots(players: SlottablePlayer[]): RosterSlot[] {
  const slots: RosterSlot[] = ROSTER_SLOTS.map((kind) => ({
    kind,
    label: labelFor(kind),
    player: null,
  }));

  const overflow: SlottablePlayer[] = [];
  for (const p of players) {
    const pos = (p.position ?? "").toUpperCase();

    // 1. dedicated starting slot for this exact position (QB/RB/WR/TE/DEF)
    let slot = slots.find((s) => s.player === null && s.kind === pos);
    // 2. FLEX for RB/WR/TE
    if (!slot && FLEX_POSITIONS.has(pos)) {
      slot = slots.find((s) => s.player === null && s.kind === "FLEX");
    }
    // 3. bench
    if (!slot) {
      slot = slots.find((s) => s.player === null && s.kind === "BN");
    }

    if (slot) slot.player = p;
    else overflow.push(p);
  }

  for (const p of overflow) {
    slots.push({ kind: "BN", label: "BN", player: p });
  }

  return slots;
}
