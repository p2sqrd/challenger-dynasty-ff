import { describe, expect, it } from "vitest";
import { resolveActingAs, toStateView, type LoadedDraft } from "./rematch-load";
import type { RematchPick } from "./rematch-draft";

const ORDER = ["harsha", "aditya", "mukund", "vij", "omar", "harish", "hirsch", "arun", "pranav", "kartik", "ari", "murali"];

function loaded(isTest: boolean, picks: RematchPick[] = []): LoadedDraft {
  return {
    draft: {
      id: "draft-1",
      season_id: "season-1",
      is_test: isTest,
      label: isTest ? "Test board" : "2026 Rematch Draft",
      order_manager_ids: ORDER,
      created_at: "2026-08-18T00:00:00Z",
    },
    order: ORDER,
    picks,
    aliasOf: (id) => id,
  };
}

describe("resolveActingAs", () => {
  it("ignores acting-as on the real draft — you are always yourself", () => {
    // Even asked explicitly to act as the champion, a live draft resolves to
    // the caller. This is the whole security boundary for the real draft.
    expect(resolveActingAs(loaded(false), "arun", "harsha")).toBe("arun");
    expect(resolveActingAs(loaded(false), "arun", "auto")).toBe("arun");
  });

  it("lets a test board act as any team in the draft", () => {
    expect(resolveActingAs(loaded(true), "arun", "harsha")).toBe("harsha");
  });

  it("falls back to the caller when the requested team isn't in the draft", () => {
    expect(resolveActingAs(loaded(true), "arun", "not-a-manager")).toBe("arun");
  });

  it("follows the clock on a test board when asked for auto", () => {
    // Empty board: 7th place (hirsch) is first up.
    expect(resolveActingAs(loaded(true), "arun", "auto")).toBe("hirsch");
    // After one pick the clock — and therefore "auto" — moves to 8th.
    const after = [
      { pickNumber: 1, week: 12, pickerManagerId: "hirsch", opponentManagerId: "harsha" },
    ];
    expect(resolveActingAs(loaded(true, after), "arun", "auto")).toBe("arun");
  });

  it("defaults to the caller when nothing is requested", () => {
    expect(resolveActingAs(loaded(true), "arun", null)).toBe("arun");
  });
});

describe("toStateView", () => {
  it("only hands out legal picks to the team on the clock", () => {
    const watching = toStateView(loaded(false), "arun");
    expect(watching.canPick).toBe(false);
    expect(watching.legal).toEqual([]);

    const onClock = toStateView(loaded(false), "hirsch");
    expect(onClock.canPick).toBe(true);
    expect(onClock.legal.some((p) => p.ok)).toBe(true);
  });

  it("reports 18 total picks for a 12-team draft", () => {
    const view = toStateView(loaded(false), null);
    expect(view.total).toBe(18);
    expect(view.made).toBe(0);
    expect(view.complete).toBe(false);
    expect(view.onTheClockId).toBe("hirsch");
  });

  it("fills the week for both teams in the board view", () => {
    const view = toStateView(
      loaded(false, [
        { pickNumber: 1, week: 13, pickerManagerId: "hirsch", opponentManagerId: "harsha" },
      ]),
      null
    );
    expect(view.byWeek.find((w) => w.week === 13)!.matchups).toHaveLength(1);
    expect(view.teams.find((t) => t.alias === "harsha")!.weeksOpen).toEqual([12, 14]);
    expect(view.teams.find((t) => t.alias === "hirsch")!.weeksOpen).toEqual([12, 14]);
  });
});
