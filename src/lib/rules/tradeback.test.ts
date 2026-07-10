import { describe, expect, it } from "vitest";
import { detectTradeback } from "./tradeback";

describe("detectTradeback", () => {
  it("has no warning when the player has no trade history", () => {
    const result = detectTradeback({
      playerId: "p1",
      proposedFromManagerId: "A",
      proposedToManagerId: "B",
      tradeHistory: [],
    });
    expect(result.warning).toBe(false);
  });

  it("warns on a direct tradeback with no intermediate team", () => {
    // B originally traded the player to A. Now A proposes trading it back to B.
    const result = detectTradeback({
      playerId: "p1",
      proposedFromManagerId: "A",
      proposedToManagerId: "B",
      tradeHistory: [
        { tradeId: "t1", playerId: "p1", fromManagerId: "B", toManagerId: "A", occurredAt: 1 },
      ],
    });
    expect(result.warning).toBe(true);
  });

  it("does not warn once the player has passed through a third team", () => {
    // B -> A -> C, now C proposes trading it back to B.
    const result = detectTradeback({
      playerId: "p1",
      proposedFromManagerId: "C",
      proposedToManagerId: "B",
      tradeHistory: [
        { tradeId: "t1", playerId: "p1", fromManagerId: "B", toManagerId: "A", occurredAt: 1 },
        { tradeId: "t2", playerId: "p1", fromManagerId: "A", toManagerId: "C", occurredAt: 2 },
      ],
    });
    expect(result.warning).toBe(false);
  });

  it("ignores trade history for other players", () => {
    const result = detectTradeback({
      playerId: "p1",
      proposedFromManagerId: "A",
      proposedToManagerId: "B",
      tradeHistory: [
        { tradeId: "t1", playerId: "p2", fromManagerId: "B", toManagerId: "A", occurredAt: 1 },
      ],
    });
    expect(result.warning).toBe(false);
  });
});
