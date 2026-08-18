import { describe, expect, it } from "vitest";
import { toStateView, type LoadedDraft } from "./rematch-load";
import type { RematchPick } from "./rematch-draft";

const ORDER = ["harsha", "aditya", "mukund", "vij", "omar", "harish", "hirsch", "arun", "pranav", "kartik", "ari", "murali"];

function loaded(
  picks: RematchPick[] = [],
  proxyByPickNumber: Map<number, string> = new Map()
): LoadedDraft {
  return {
    draft: {
      id: "draft-1",
      season_id: "season-1",
      is_test: false,
      label: "2026 Rematch Draft",
      order_manager_ids: ORDER,
      created_at: "2026-08-18T00:00:00Z",
    },
    order: ORDER,
    picks,
    proxyByPickNumber,
    aliasOf: (id) => id,
  };
}

describe("toStateView", () => {
  it("only hands out legal picks to the team on the clock", () => {
    const watching = toStateView(loaded(), "arun");
    expect(watching.canPick).toBe(false);
    expect(watching.legal).toEqual([]);
    expect(watching.pickingFor).toBeNull();

    const onClock = toStateView(loaded(), "hirsch");
    expect(onClock.canPick).toBe(true);
    expect(onClock.legal.some((p) => p.ok)).toBe(true);
    // Their own turn, so nothing to warn about.
    expect(onClock.pickingFor).toBeNull();
  });

  it("reports 18 total picks for a 12-team draft", () => {
    const view = toStateView(loaded(), null);
    expect(view.total).toBe(18);
    expect(view.made).toBe(0);
    expect(view.complete).toBe(false);
    expect(view.onTheClockId).toBe("hirsch");
  });

  it("fills the week for both teams in the board view", () => {
    const view = toStateView(
      loaded([
        { pickNumber: 1, week: 13, pickerManagerId: "hirsch", opponentManagerId: "harsha" },
      ]),
      null
    );
    expect(view.byWeek.find((w) => w.week === 13)!.matchups).toHaveLength(1);
    expect(view.teams.find((t) => t.alias === "harsha")!.weeksOpen).toEqual([12, 14]);
    expect(view.teams.find((t) => t.alias === "hirsch")!.weeksOpen).toEqual([12, 14]);
  });
});

describe("picking for someone else", () => {
  it("gives a flag holder the options of whoever is on the clock", () => {
    const view = toStateView(loaded(), "pranav", { canPickForOthers: true });

    expect(view.canPickForOthers).toBe(true);
    expect(view.canPick).toBe(true);
    expect(view.pickingFor).toEqual({ managerId: "hirsch", alias: "hirsch" });
    expect(view.legal.some((p) => p.ok)).toBe(true);
    // Hirsch's list, not Pranav's: hirsch is the one option missing from it.
    expect(view.legal.every((p) => p.opponentManagerId !== "hirsch" || !p.ok)).toBe(true);
    expect(view.legal.some((p) => p.opponentManagerId === "pranav" && p.ok)).toBe(true);
  });

  it("names the team in the greyed-out reasons rather than saying 'you'", () => {
    const view = toStateView(loaded(), "pranav", { canPickForOthers: true });
    const self = view.legal.find((p) => p.opponentManagerId === "hirsch")!;
    expect(self.ok).toBe(false);
    expect(self.reason).toBe("hirsch can't play themselves.");
  });

  it("doesn't warn the flag holder on their own turn", () => {
    const picks: RematchPick[] = [
      { pickNumber: 1, week: 12, pickerManagerId: "hirsch", opponentManagerId: "harsha" },
      { pickNumber: 2, week: 12, pickerManagerId: "arun", opponentManagerId: "aditya" },
    ];
    const view = toStateView(loaded(picks), "pranav", { canPickForOthers: true });

    expect(view.onTheClockId).toBe("pranav");
    expect(view.canPick).toBe(true);
    expect(view.pickingFor).toBeNull();
  });

  it("leaves everyone without the flag exactly as they were", () => {
    const view = toStateView(loaded(), "pranav");
    expect(view.canPickForOthers).toBe(false);
    expect(view.canPick).toBe(false);
    expect(view.pickingFor).toBeNull();
    expect(view.legal).toEqual([]);
  });

  it("marks the matchup with who made the pick, and leaves auto-fills alone", () => {
    const picks: RematchPick[] = [
      { pickNumber: 1, week: 12, pickerManagerId: "hirsch", opponentManagerId: "harsha" },
    ];
    const view = toStateView(
      loaded(picks, new Map([[1, "pranav"]])),
      null
    );

    const made = view.byWeek.find((w) => w.week === 12)!.matchups[0];
    expect(made.pickerAlias).toBe("hirsch");
    expect(made.byProxyAlias).toBe("pranav");
    expect(view.history[0].byProxyAlias).toBe("pranav");
  });

  it("never marks a matchup the board assigned itself", () => {
    // Five of six Week 12 matchups made, so ari v murali fills itself.
    const picks: RematchPick[] = [
      { pickNumber: 1, week: 12, pickerManagerId: "hirsch", opponentManagerId: "harsha" },
      { pickNumber: 2, week: 12, pickerManagerId: "arun", opponentManagerId: "aditya" },
      { pickNumber: 3, week: 12, pickerManagerId: "pranav", opponentManagerId: "mukund" },
      { pickNumber: 4, week: 12, pickerManagerId: "kartik", opponentManagerId: "vij" },
      { pickNumber: 5, week: 12, pickerManagerId: "omar", opponentManagerId: "harish" },
    ];
    const week12 = toStateView(
      loaded(picks, new Map([[5, "pranav"]])),
      null
    ).byWeek.find((w) => w.week === 12)!.matchups;

    expect(week12).toHaveLength(6);
    const auto = week12.find((m) => m.auto)!;
    expect(auto.byProxyAlias).toBeNull();
    expect(week12.find((m) => m.pickNumber === 5)!.byProxyAlias).toBe("pranav");
  });
});
