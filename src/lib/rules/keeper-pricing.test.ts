import { describe, expect, it } from "vitest";
import { computeKeeperPrice } from "./keeper-pricing";

describe("computeKeeperPrice", () => {
  it("adds $3 to the previous auction price by default", () => {
    const result = computeKeeperPrice({
      priorRecord: { price: 22, source: "auction" },
    });
    expect(result).toEqual({ newPrice: 25, priceRule: "standard_plus_3" });
  });

  it("adds $3 on top of a previous keeper price", () => {
    const result = computeKeeperPrice({
      priorRecord: { price: 25, source: "keeper" },
    });
    expect(result).toEqual({ newPrice: 28, priceRule: "standard_plus_3" });
  });

  it("prices a first-year waiver keeper at FAAB paid", () => {
    const result = computeKeeperPrice({
      priorRecord: { price: 12, source: "waiver" },
    });
    expect(result).toEqual({ newPrice: 12, priceRule: "waiver_first_year" });
  });

  it("floors a first-year waiver keeper at $5", () => {
    const result = computeKeeperPrice({
      priorRecord: { price: 2, source: "waiver" },
    });
    expect(result).toEqual({ newPrice: 5, priceRule: "waiver_first_year" });
  });

  it("uses the original auction price for drafted-then-dropped-then-repicked players", () => {
    const result = computeKeeperPrice({
      priorRecord: { price: 1, source: "waiver" },
      originalAuctionPrice: 34,
    });
    expect(result).toEqual({ newPrice: 34, priceRule: "drafted_and_dropped" });
  });
});
