import { describe, it, expect } from "vitest";
import { assignRosterSlots, type SlottablePlayer } from "./roster-slots";

function p(
  playerId: string,
  position: string | null,
  newPrice = 5
): SlottablePlayer {
  return { playerId, name: playerId, position, newPrice };
}

function filled(slots: ReturnType<typeof assignRosterSlots>) {
  return slots
    .filter((s) => s.player)
    .map((s) => `${s.kind}:${s.player!.playerId}`);
}

describe("assignRosterSlots", () => {
  it("returns 16 empty slots for no keepers", () => {
    const slots = assignRosterSlots([]);
    expect(slots).toHaveLength(16);
    expect(slots.every((s) => s.player === null)).toBe(true);
    expect(slots.filter((s) => s.kind !== "BN")).toHaveLength(9);
  });

  it("fills dedicated starting slots by position", () => {
    const slots = assignRosterSlots([
      p("qb1", "QB"),
      p("rb1", "RB"),
      p("wr1", "WR"),
      p("te1", "TE"),
    ]);
    expect(filled(slots)).toEqual(["QB:qb1", "RB:rb1", "WR:wr1", "TE:te1"]);
  });

  it("overflows an RB into FLEX once both RB slots are taken", () => {
    const slots = assignRosterSlots([
      p("rb1", "RB"),
      p("rb2", "RB"),
      p("rb3", "RB"),
    ]);
    const byId = new Map(
      slots.filter((s) => s.player).map((s) => [s.player!.playerId, s.kind])
    );
    expect(byId.get("rb1")).toBe("RB");
    expect(byId.get("rb2")).toBe("RB");
    expect(byId.get("rb3")).toBe("FLEX");
  });

  it("respects selection order for the FLEX slot", () => {
    // te1 is selected before the 4th WR, so te1 claims FLEX; wr4 goes to bench.
    const slots = assignRosterSlots([
      p("wr1", "WR"),
      p("wr2", "WR"),
      p("wr3", "WR"),
      p("te1", "TE"),
      p("te2", "TE"),
      p("wr4", "WR"),
    ]);
    const byId = new Map(
      slots.filter((s) => s.player).map((s) => [s.player!.playerId, s.kind])
    );
    expect(byId.get("te1")).toBe("TE");
    expect(byId.get("te2")).toBe("FLEX"); // TE is FLEX-eligible, selected first
    expect(byId.get("wr4")).toBe("BN");
  });

  it("sends a second QB and unknown positions to the bench", () => {
    const slots = assignRosterSlots([
      p("qb1", "QB"),
      p("qb2", "QB"),
      p("mystery", null),
    ]);
    const byId = new Map(
      slots.filter((s) => s.player).map((s) => [s.player!.playerId, s.kind])
    );
    expect(byId.get("qb1")).toBe("QB");
    expect(byId.get("qb2")).toBe("BN");
    expect(byId.get("mystery")).toBe("BN");
  });

  it("places a DEF keeper in the DEF slot", () => {
    const slots = assignRosterSlots([p("def1", "DEF")]);
    const def = slots.find((s) => s.kind === "DEF");
    expect(def?.player?.playerId).toBe("def1");
  });
});
