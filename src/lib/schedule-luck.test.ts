import { describe, expect, it } from "vitest";
import { computeScheduleLuck, type WeekData, type TeamMeta } from "./schedule-luck";

// A tiny 3-team league. Each week is a full round-robin-ish slate: two teams
// play, the third's opponent is set so every roster has a game. We hand-craft
// scores so the outcomes are easy to verify by hand.
const meta: Record<number, TeamMeta> = {
  1: { name: "Ann", color: "#111", active: true },
  2: { name: "Bo", color: "#222", active: true },
  3: { name: "Cy", color: "#333", active: true },
};

describe("computeScheduleLuck", () => {
  it("puts each team's real record on the diagonal and mirrors it via the self-swap", () => {
    // Week 1: 1 vs 2 (1 wins), 3 plays... give 3 an opponent by pairing 3 with
    // a phantom is not possible in 3-team, so use two weeks of 1v2 / 1v3 / 2v3.
    const weeks: WeekData[] = [
      // Week 1: 1 plays 2 (1 wins 100-90); 3 idle (no game)
      { points: { 1: 100, 2: 90, 3: 80 }, opponent: { 1: 2, 2: 1 } },
      // Week 2: 1 plays 3 (3 wins 95-70); 2 idle
      { points: { 1: 70, 2: 60, 3: 95 }, opponent: { 1: 3, 3: 1 } },
      // Week 3: 2 plays 3 (2 wins 110-100); 1 idle
      { points: { 1: 50, 2: 110, 3: 100 }, opponent: { 2: 3, 3: 2 } },
    ];

    const teams = computeScheduleLuck([1, 2, 3], meta, weeks);
    const byId = Object.fromEntries(teams.map((t) => [t.rosterId, t]));

    // Real records: Ann 1-1 (beat Bo, lost to Cy), Bo 1-1, Cy 1-1.
    expect(byId[1].actual).toEqual({ wins: 1, losses: 1, ties: 0 });
    expect(byId[2].actual).toEqual({ wins: 1, losses: 1, ties: 0 });
    expect(byId[3].actual).toEqual({ wins: 1, losses: 1, ties: 0 });

    // Diagonal cell equals the real record, delta 0.
    expect(byId[1].vs[1]).toEqual({ wins: 1, losses: 1, ties: 0, delta: 0 });
  });

  it("computes a hypothetical record under another team's schedule with the self-swap", () => {
    const weeks: WeekData[] = [
      // Week 1: 1v2, 1 wins 100-90. 3 has no game.
      { points: { 1: 100, 2: 90, 3: 130 }, opponent: { 1: 2, 2: 1 } },
      // Week 2: 1v3, 3 wins 95-70. 2 has no game.
      { points: { 1: 70, 2: 200, 3: 95 }, opponent: { 1: 3, 3: 1 } },
    ];

    const teams = computeScheduleLuck([1, 2, 3], meta, weeks);
    const byId = Object.fromEntries(teams.map((t) => [t.rosterId, t]));

    // Ann's real record: W1 beat Bo, W2 lost to Cy → 1-1.
    expect(byId[1].actual).toEqual({ wins: 1, losses: 1, ties: 0 });

    // Ann playing Cy's schedule:
    //  W1: Cy had no game → skipped.
    //  W2: Cy actually played Ann (opponent[3]=1). Self-swap → Ann plays Cy.
    //      Ann 70 vs Cy 95 → loss.
    // So Ann under Cy's schedule: 0-1, delta 0 - 1 = -1.
    expect(byId[1].vs[3]).toEqual({ wins: 0, losses: 1, ties: 0, delta: -1 });

    // Ann playing Bo's schedule:
    //  W1: Bo played Ann → self-swap → Ann plays Bo: 100 vs 90 → win.
    //  W2: Bo had no game → skipped.
    // Ann under Bo's schedule: 1-0, delta 1 - 1 = 0.
    expect(byId[1].vs[2]).toEqual({ wins: 1, losses: 0, ties: 0, delta: 0 });
  });

  it("rewards a soft schedule with positive luck", () => {
    // Two weeks. Team 1 scores middling but happens to face the low scorers.
    const weeks: WeekData[] = [
      // W1: 1(80) beats 2(70); 3(200) idle.
      { points: { 1: 80, 2: 70, 3: 200 }, opponent: { 1: 2, 2: 1 } },
      // W2: 1(80) beats 3(75); 2(200) idle.
      { points: { 1: 80, 2: 200, 3: 75 }, opponent: { 1: 3, 3: 1 } },
    ];
    const teams = computeScheduleLuck([1, 2, 3], meta, weeks);
    const ann = teams.find((t) => t.rosterId === 1)!;
    // Ann won both real games (2-0) but only faced weak scores; under others'
    // schedules she'd have run into the 200s, so avgSimWins < 2 → luck > 0.
    expect(ann.actual.wins).toBe(2);
    expect(ann.luck).toBeGreaterThan(0);
  });
});
