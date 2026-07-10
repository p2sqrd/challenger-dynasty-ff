import type { DraftSource, KeeperPriceRule } from "@/types/database";

export interface PriorAcquisition {
  price: number;
  source: DraftSource;
}

export interface KeeperPriceInput {
  /** The player's draft_records row from the season immediately prior. */
  priorRecord: PriorAcquisition;
  /**
   * Original auction price paid the last time this player was drafted, if
   * they were drafted and dropped at some point before their current
   * (waiver) stint on this roster. Omit if the player has no such history.
   */
  originalAuctionPrice?: number;
}

export interface KeeperPriceResult {
  newPrice: number;
  priceRule: KeeperPriceRule;
}

const MIN_WAIVER_KEEPER_PRICE = 5;
const STANDARD_INCREMENT = 3;

/**
 * Spec section 4. The waiver-first-year and drafted-and-dropped rules only
 * apply the year a player's most recent acquisition was via waiver — once a
 * player has been kept once, `priorRecord.source` becomes 'keeper' for the
 * following year's call and the standard +3 applies from then on. That
 * progression falls out of always keying off the immediately prior season's
 * record rather than needing an explicit "is this their first keeper year"
 * flag.
 */
export function computeKeeperPrice(input: KeeperPriceInput): KeeperPriceResult {
  const { priorRecord, originalAuctionPrice } = input;

  if (priorRecord.source === "waiver") {
    if (originalAuctionPrice != null) {
      return { newPrice: originalAuctionPrice, priceRule: "drafted_and_dropped" };
    }
    return {
      newPrice: Math.max(priorRecord.price, MIN_WAIVER_KEEPER_PRICE),
      priceRule: "waiver_first_year",
    };
  }

  return {
    newPrice: priorRecord.price + STANDARD_INCREMENT,
    priceRule: "standard_plus_3",
  };
}
