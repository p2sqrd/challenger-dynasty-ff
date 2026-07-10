import { describe, expect, it } from "vitest";
import {
  validateKeeperBudget,
  validateKeeperCount,
} from "./budget-validation";

describe("validateKeeperBudget", () => {
  it("passes when remaining budget is within the $125-$275 band", () => {
    const result = validateKeeperBudget({
      startingBudget: 200,
      totalKeeperSpend: 50,
    });
    expect(result.ok).toBe(true);
    expect(result.remainingBudget).toBe(150);
    expect(result.violations).toEqual([]);
  });

  it("flags when spend leaves less than the floor", () => {
    const result = validateKeeperBudget({
      startingBudget: 200,
      totalKeeperSpend: 100,
    });
    expect(result.ok).toBe(false);
    expect(result.remainingBudget).toBe(100);
    expect(result.violations).toHaveLength(1);
  });

  it("flags when spend leaves more than the ceiling", () => {
    const result = validateKeeperBudget({
      startingBudget: 200,
      totalKeeperSpend: -100,
    });
    expect(result.ok).toBe(false);
    expect(result.remainingBudget).toBe(300);
    expect(result.violations).toHaveLength(1);
  });

  it("respects a non-default starting budget (e.g. a rule-change year)", () => {
    const result = validateKeeperBudget({
      startingBudget: 300,
      totalKeeperSpend: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.remainingBudget).toBe(300);
    expect(result.violations[0]).toMatch(/ceiling/);
  });
});

describe("validateKeeperCount", () => {
  it("passes when keeper count is within the roster limit", () => {
    expect(validateKeeperCount({ keeperCount: 5, maxKeepers: 8 }).ok).toBe(
      true
    );
  });

  it("blocks when keeper count exceeds the roster limit", () => {
    const result = validateKeeperCount({ keeperCount: 9, maxKeepers: 8 });
    expect(result.ok).toBe(false);
    expect(result.violations).toHaveLength(1);
  });
});
