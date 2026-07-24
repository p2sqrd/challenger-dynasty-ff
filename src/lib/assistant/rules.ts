/**
 * The league constitution, as plain text for the AI assistant's context. This
 * mirrors the public /rules page — it's the same information every manager can
 * already read. It intentionally includes the keeper *pricing formula* (a
 * public rule) but never any actual keeper price, budget, or pick (those are
 * private and are never sent to the assistant — see context.ts).
 */
export const LEAGUE_RULES = `CHALLENGER DYNASTY — LEAGUE RULES

Auction & keeper economy:
- Auction draft every year with a $200 budget. Leftover auction money is relinquished.
- To keep a player from the previous year, take last year's salary and add $3.
  (e.g. drafted at $7 last year → costs $10 to keep this year.)
- A waiver-wire pickup's first-year keeper price is the FAAB paid (minimum $5); the $3 tax is added in following years. Exception: a drafted-and-dropped player is kept at the original auction price.
- Players can be traded for money and/or other players.
- Every manager must leave a minimum of $125 and a maximum of $275 in next year's draft money.
- Tradebacks are only allowed after the draft: once a player is traded away, they cannot return to the original team via trade unless they have passed through a third team in between.
- Roster size is 16, and each open roster spot must be fillable at the $1 minimum.

Penalties:
- Negligence (not setting your roster, playing players on bye/IR): 1st offense warning, 2nd −$5 FAAB, 3rd −$5 auction next year, 4th removed from the league. Most negligence strikes = has to make a music video.
- Collusion (making moves to help another team without improving your own): 1st −$10 auction, 2nd −$30 auction, 3rd −$50 auction.

Season / punishments:
- Last place has to create a music video; failing to submit one before the next season starts is a $50 draft penalty.
- Winner takes all — winnings cover jersey & trophy engraving, and the winner keeps all leftover money.

Recent amendments:
- Bench converted to a WR starting in the '24-25 season.
- New defense scoring.`;
