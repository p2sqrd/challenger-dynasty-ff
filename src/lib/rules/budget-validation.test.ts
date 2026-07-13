import { describe, expect, it } from "vitest";
import { validateKeeperRoster } from "./budget-validation";

describe("validateKeeperRoster", () => {
  it("allows keepers as long as $1 remains for every open roster spot", () => {
    // $200, keep 10 for $194 → $6 left for 6 spots ($6 ≥ 6). Allowed.
    const result = validateKeeperRoster({
      startingBudget: 200,
      totalKeeperSpend: 194,
      keeperCount: 10,
    });
    expect(result.ok).toBe(true);
    expect(result.remainingBudget).toBe(6);
    expect(result.emptySpots).toBe(6);
    expect(result.minToFillRoster).toBe(6);
  });

  it("blocks when the remaining budget can't fill the open spots at $1 each", () => {
    // $200, keep 10 for $195 → $5 left for 6 spots. Not allowed.
    const result = validateKeeperRoster({
      startingBudget: 200,
      totalKeeperSpend: 195,
      keeperCount: 10,
    });
    expect(result.ok).toBe(false);
    expect(result.remainingBudget).toBe(5);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatch(/at least \$6/);
  });

  it("uses the manager's own trade-adjusted budget", () => {
    // Pranav's $177 budget, keeping 12 for $173 → $4 left for 4 spots. OK.
    const ok = validateKeeperRoster({
      startingBudget: 177,
      totalKeeperSpend: 173,
      keeperCount: 12,
    });
    expect(ok.ok).toBe(true);
    // One dollar more and it fails ($3 left for 4 spots).
    const bad = validateKeeperRoster({
      startingBudget: 177,
      totalKeeperSpend: 174,
      keeperCount: 12,
    });
    expect(bad.ok).toBe(false);
  });

  it("keeping a full 16-man roster needs no fill money", () => {
    const result = validateKeeperRoster({
      startingBudget: 177,
      totalKeeperSpend: 177,
      keeperCount: 16,
    });
    expect(result.ok).toBe(true);
    expect(result.emptySpots).toBe(0);
    expect(result.minToFillRoster).toBe(0);
  });

  it("blocks keeping more than 16 players", () => {
    const result = validateKeeperRoster({
      startingBudget: 200,
      totalKeeperSpend: 17,
      keeperCount: 17,
    });
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => /at most 16/.test(v))).toBe(true);
  });
});
