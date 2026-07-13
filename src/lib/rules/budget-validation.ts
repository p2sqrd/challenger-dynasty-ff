/** Every team fields a 16-man roster. */
export const ROSTER_SIZE = 16;
/** The cheapest a roster spot can be filled at auction. */
export const MIN_PLAYER_COST = 1;

export interface KeeperRosterInput {
  /** This manager's auction budget for the season (already trade-adjusted). */
  startingBudget: number;
  /** Total new-price cost of the players being kept. */
  totalKeeperSpend: number;
  /** How many players are being kept. */
  keeperCount: number;
  rosterSize?: number;
}

export interface KeeperRosterResult {
  ok: boolean;
  /** Budget left after paying for keepers. */
  remainingBudget: number;
  /** Roster spots still to be filled at the auction. */
  emptySpots: number;
  /** Minimum dollars needed to fill those spots at $1 each. */
  minToFillRoster: number;
  /** The most a manager could spend on keepers at the current keeper count. */
  maxKeeperSpend: number;
  violations: string[];
}

/**
 * A keeper set is legal as long as, after paying for the kept players, the
 * manager still has at least $1 left for every empty roster spot — i.e. they
 * can always fill out all 16 spots, worst case with $1 players at the
 * auction. (Rules: 16-man roster, $1 minimum bid.)
 *
 * Example: a $200 budget keeping 10 players for $194 leaves $6 for the
 * remaining 6 spots ($6 ≥ 6×$1) — allowed. The same 10 players for $195
 * leaves only $5 for 6 spots — not allowed.
 */
export function validateKeeperRoster(
  input: KeeperRosterInput
): KeeperRosterResult {
  const rosterSize = input.rosterSize ?? ROSTER_SIZE;
  const { startingBudget, totalKeeperSpend, keeperCount } = input;

  const remainingBudget = startingBudget - totalKeeperSpend;
  const emptySpots = Math.max(0, rosterSize - keeperCount);
  const minToFillRoster = emptySpots * MIN_PLAYER_COST;
  const maxKeeperSpend = startingBudget - minToFillRoster;

  const violations: string[] = [];

  if (keeperCount > rosterSize) {
    violations.push(
      `You can keep at most ${rosterSize} players — one per roster spot.`
    );
  }

  if (remainingBudget < minToFillRoster) {
    violations.push(
      `This leaves $${remainingBudget} for your ${emptySpots} open roster ` +
        `spot${emptySpots === 1 ? "" : "s"}, but you need at least ` +
        `$${minToFillRoster} to fill them ($1 each). Trim $${
          minToFillRoster - remainingBudget
        } of keeper cost.`
    );
  }

  return {
    ok: violations.length === 0,
    remainingBudget,
    emptySpots,
    minToFillRoster,
    maxKeeperSpend,
    violations,
  };
}
