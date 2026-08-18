import { describe, expect, it } from "vitest";
import { toStateView, type LoadedDraft } from "./rematch-load";
import type { RematchPick } from "./rematch-draft";

const ORDER = ["harsha", "aditya", "mukund", "vij", "omar", "harish", "hirsch", "arun", "pranav", "kartik", "ari", "murali"];

function loaded(picks: RematchPick[] = []): LoadedDraft {
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
    aliasOf: (id) => id,
  };
}

describe("toStateView", () => {
  it("only hands out legal picks to the team on the clock", () => {
    const watching = toStateView(loaded(), "arun");
    expect(watching.canPick).toBe(false);
    expect(watching.legal).toEqual([]);

    const onClock = toStateView(loaded(), "hirsch");
    expect(onClock.canPick).toBe(true);
    expect(onClock.legal.some((p) => p.ok)).toBe(true);
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
