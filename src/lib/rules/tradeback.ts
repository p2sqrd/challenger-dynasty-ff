export interface PlayerTradeEvent {
  tradeId: string;
  playerId: string;
  fromManagerId: string;
  toManagerId: string;
  /** Any orderable value — timestamp, sequence number, etc. */
  occurredAt: number;
}

export interface TradebackCheckInput {
  playerId: string;
  /** The manager currently proposing to send the player away. */
  proposedFromManagerId: string;
  /** The manager who would receive the player in the proposed trade. */
  proposedToManagerId: string;
  /** Full trade history for this player, any order. */
  tradeHistory: PlayerTradeEvent[];
}

export interface TradebackCheckResult {
  warning: boolean;
  reason?: string;
}

/**
 * Spec section 4: a player can't be traded back to the team that originally
 * traded them away unless they've passed through a third team first. This
 * is a warning surfaced to the commissioner at approval time, not a hard
 * block — legitimate exceptions happen.
 *
 * Method: find the last time proposedToManagerId sent this player away.
 * Everything that's happened to the player since then is the "return
 * chain" — if that chain only ever touched proposedFromManagerId (i.e. it
 * went straight from proposedToManagerId to proposedFromManagerId with no
 * third team in between), sending it back now is a direct tradeback.
 */
export function detectTradeback(input: TradebackCheckInput): TradebackCheckResult {
  const { playerId, proposedFromManagerId, proposedToManagerId, tradeHistory } =
    input;

  const history = tradeHistory
    .filter((event) => event.playerId === playerId)
    .sort((a, b) => a.occurredAt - b.occurredAt);

  let lastDepartureFromDestinationIndex = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].fromManagerId === proposedToManagerId) {
      lastDepartureFromDestinationIndex = i;
      break;
    }
  }

  if (lastDepartureFromDestinationIndex === -1) {
    return { warning: false };
  }

  const returnChain = history.slice(lastDepartureFromDestinationIndex);
  const teamsVisitedSinceDeparture = new Set(
    returnChain.map((event) => event.toManagerId)
  );
  teamsVisitedSinceDeparture.delete(proposedToManagerId);

  const passedThroughThirdTeam = teamsVisitedSinceDeparture.size > 1;

  if (passedThroughThirdTeam) {
    return { warning: false };
  }

  return {
    warning: true,
    reason: `${playerId} would move from ${proposedFromManagerId} back to ${proposedToManagerId}, the team that originally traded them away, without having passed through a third team first.`,
  };
}
