/**
 * The keeper rule keeps every manager's auction budget between $125 and $275.
 * In a Fire Sale that bounds the bids:
 *  - a buyer spends money, so they can't drop below $125 → max = budget − 125
 *  - the winning bid can't push the seller above $275 → max = 275 − sellerBudget
 * A bidder's ceiling is the smaller of the two (never below 0).
 */
export const KEEPER_BUDGET_FLOOR = 125;
export const KEEPER_BUDGET_CEIL = 275;

export function maxBidFor({
  bidderBudget,
  sellerBudget,
}: {
  bidderBudget: number;
  sellerBudget: number;
}): number {
  const bidderCap = bidderBudget - KEEPER_BUDGET_FLOOR;
  const sellerCap = KEEPER_BUDGET_CEIL - sellerBudget;
  return Math.max(0, Math.min(bidderCap, sellerCap));
}
