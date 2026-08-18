import { describe, expect, it } from "vitest";
import {
  FINISH_BY_YEAR,
  REMATCH_WEEKS,
  TOTAL_PICKS,
  buildBoard,
  canComplete,
  finishOrderFor,
  legalPicks,
  onTheClock,
  turnOrder,
  type RematchPick,
} from "./rematch-draft";

// 2025 final playoff finish, 1st → 12th. Real names as ids keeps the
// expectations readable.
const FINISH = [
  "Harsha", // 1st
  "Aditya", // 2nd
  "Mukund", // 3rd
  "Vij", // 4th
  "Omar", // 5th
  "Harish", // 6th
  "Hirsch", // 7th — consolation winner
  "Arun", // 8th
  "Pranav", // 9th
  "Kartik", // 10th
  "Ari", // 11th
  "Murali", // 12th
];

function pick(
  pickNumber: number,
  pickerManagerId: string,
  opponentManagerId: string,
  week: number
): RematchPick {
  return { pickNumber, week, pickerManagerId, opponentManagerId };
}

describe("finishOrderFor", () => {
  it("drafts a season on the previous season's finish", () => {
    // The 2026 draft runs off how 2025 ended, champion last.
    expect(finishOrderFor(2026)).toBe(FINISH_BY_YEAR[2025]);
    expect(finishOrderFor(2026)).toHaveLength(12);
  });

  it("returns null for a year that hasn't been recorded", () => {
    // What the page turns into "no draft yet" instead of a crash.
    expect(finishOrderFor(2027)).toBeNull();
  });
});

describe("turnOrder", () => {
  it("opens with the consolation winner and closes with the champion", () => {
    // 7th → 12th, then 6th → 1st.
    expect(turnOrder(FINISH).slice(0, 12)).toEqual([
      "Hirsch",
      "Arun",
      "Pranav",
      "Kartik",
      "Ari",
      "Murali",
      "Harish",
      "Omar",
      "Vij",
      "Mukund",
      "Aditya",
      "Harsha",
    ]);
  });

  it("snakes back the other way in round 2", () => {
    expect(turnOrder(FINISH).slice(12, 24)).toEqual([
      "Harsha",
      "Aditya",
      "Mukund",
      "Vij",
      "Omar",
      "Harish",
      "Murali",
      "Ari",
      "Kartik",
      "Pranav",
      "Arun",
      "Hirsch",
    ]);
  });
});

describe("buildBoard", () => {
  it("fills the week for both teams in a matchup", () => {
    const board = buildBoard(FINISH, [pick(1, "Hirsch", "Harsha", 13)]);
    const hirsch = board.teams.get("Hirsch")!;
    const harsha = board.teams.get("Harsha")!;

    expect(hirsch.weeksUsed).toEqual([13]);
    expect(hirsch.opponents).toEqual(["Harsha"]);
    expect(hirsch.weeksOpen).toEqual([12, 14]);
    // The team that was picked has its Week 13 filled too — it can neither
    // pick nor be picked for Week 13 again.
    expect(harsha.weeksUsed).toEqual([13]);
    expect(harsha.opponents).toEqual(["Hirsch"]);
    expect(harsha.weeksOpen).toEqual([12, 14]);
    expect(board.made).toBe(1);
    expect(board.complete).toBe(false);
  });
});

describe("onTheClock", () => {
  it("puts the 7th-place finisher on the clock first", () => {
    expect(onTheClock(FINISH, [])).toBe("Hirsch");
  });

  it("advances one turn per pick", () => {
    expect(onTheClock(FINISH, [pick(1, "Hirsch", "Harsha", 13)])).toBe("Arun");
  });

  it("skips a team whose three weeks were all filled by other teams picking it", () => {
    // The first three picks all take Murali — one per week — so Murali is full
    // before turn 6, his own turn, ever comes up.
    const picks = [
      pick(1, "Hirsch", "Murali", 12),
      pick(2, "Arun", "Murali", 13),
      pick(3, "Pranav", "Murali", 14),
      pick(4, "Kartik", "Harsha", 12),
      pick(5, "Ari", "Aditya", 12),
    ];
    expect(buildBoard(FINISH, picks).teams.get("Murali")!.weeksOpen).toEqual([]);
    // Turn 6 is Murali's, but he has nothing left to fill, so the clock passes
    // him entirely and lands on turn 7, Harish. Murali never picks.
    expect(onTheClock(FINISH, picks)).toBe("Harish");
  });
});

describe("legalPicks", () => {
  const base = [pick(1, "Hirsch", "Harsha", 13)];

  it("rejects picking yourself", () => {
    const self = legalPicks(FINISH, base, "Arun").filter(
      (p) => p.opponentManagerId === "Arun"
    );
    expect(self).toHaveLength(REMATCH_WEEKS.length);
    expect(self.every((p) => !p.ok)).toBe(true);
    expect(self[0].reason).toMatch(/play yourself/);
  });

  it("rejects a week either side has already filled", () => {
    const options = legalPicks(FINISH, base, "Hirsch");
    // Hirsch's own Week 13 is gone.
    expect(
      options.find((p) => p.opponentManagerId === "Arun" && p.week === 13)
    ).toMatchObject({ ok: false, reason: "Your Week 13 is already set." });
    // And so is Harsha's, from the other side of the same matchup.
    const vsHarsha = legalPicks(FINISH, base, "Arun").find(
      (p) => p.opponentManagerId === "Harsha" && p.week === 13
    )!;
    expect(vsHarsha.ok).toBe(false);
    expect(vsHarsha.reason).toMatch(/already set for Harsha/);
  });

  it("rejects a team you already face in another week", () => {
    const again = legalPicks(FINISH, base, "Hirsch").find(
      (p) => p.opponentManagerId === "Harsha" && p.week === 14
    )!;
    expect(again.ok).toBe(false);
    expect(again.reason).toBe("Already your Week 13 opponent.");
  });

  it("uses the name resolver in the reason text", () => {
    const options = legalPicks(FINISH, base, "Arun", (id) => id.toUpperCase());
    const vsHarsha = options.find(
      (p) => p.opponentManagerId === "Harsha" && p.week === 13
    )!;
    expect(vsHarsha.reason).toMatch(/HARSHA/);
  });
});

describe("canComplete", () => {
  // Six teams, three weeks: each plays three distinct opponents, one per week.
  const SIX = ["A", "B", "C", "D", "E", "F"];

  it("blocks the pick that would strand the last two teams", () => {
    // Week 12 is done, and C-E have taken Week 13. D is on the clock.
    const picks = [
      pick(1, "A", "B", 12),
      pick(2, "C", "D", 12),
      pick(3, "E", "F", 12),
      pick(4, "C", "E", 13),
    ];

    // If D takes F for Week 13, then C/D/E/F are all full and only A and B are
    // left open in both Week 13 and Week 14 — but they already played in Week
    // 12, so they'd have to face each other twice. Dead end.
    const stranding = legalPicks(SIX, picks, "D").find(
      (p) => p.opponentManagerId === "F" && p.week === 13
    )!;
    expect(stranding.ok).toBe(false);
    expect(stranding.reason).toMatch(/no legal opponent later/);

    // Taking A or B for Week 13 instead keeps the board solvable.
    expect(
      legalPicks(SIX, picks, "D").find(
        (p) => p.opponentManagerId === "A" && p.week === 13
      )!.ok
    ).toBe(true);

    // And the board really is unsolvable once that pick is made.
    const after = buildBoard(SIX, [...picks, pick(5, "D", "F", 13)]);
    expect(canComplete(after, SIX)).toBe(false);
  });

  it("accepts an empty board", () => {
    expect(canComplete(buildBoard(FINISH, []), FINISH)).toBe(true);
  });
});

describe("a full guarded draft", () => {
  it("always completes — 18 matchups, 3 distinct opponents each, one per week", () => {
    // Greedily take the first legal option every turn. The lookahead guard is
    // the only thing keeping this from dead-ending: without it, 33.8% of
    // randomly-played legal drafts strand the last teams.
    const picks: RematchPick[] = [];
    for (let n = 1; n <= TOTAL_PICKS; n++) {
      const picker = onTheClock(FINISH, picks)!;
      expect(picker).not.toBeNull();
      const option = legalPicks(FINISH, picks, picker).find((p) => p.ok);
      expect(option, `no legal pick at pick ${n}`).toBeDefined();
      picks.push(pick(n, picker, option!.opponentManagerId, option!.week));
    }

    const board = buildBoard(FINISH, picks);
    expect(board.complete).toBe(true);
    expect(onTheClock(FINISH, picks)).toBeNull();

    for (const week of REMATCH_WEEKS) {
      expect(board.byWeek.get(week)).toHaveLength(FINISH.length / 2);
    }
    for (const id of FINISH) {
      const slots = board.teams.get(id)!;
      expect(slots.weeksUsed).toEqual([...REMATCH_WEEKS]);
      expect(new Set(slots.opponents).size).toBe(REMATCH_WEEKS.length);
      expect(slots.opponents).not.toContain(id);
    }
  });
});
