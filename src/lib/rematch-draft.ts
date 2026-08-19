/**
 * Rematch Draft rules engine — pure, no I/O.
 *
 * The league has 12 teams but a 14-week regular season, so weeks 1–11 give
 * every team 11 unique opponents and weeks 12–14 are repeats. Those three
 * repeat matchups are drafted, snake style, in reverse order of last season's
 * playoff finish: the consolation-bracket winner (7th) picks first, the
 * champion (1st) picks last.
 *
 * A pick is (opponent, week) and fills that week's slot for BOTH teams, so
 * there are exactly 18 picks (12 teams × 3 weeks ÷ 2). A team whose three
 * slots are already full is skipped when its turn comes around.
 */

/** The three repeat weeks being drafted. */
export const REMATCH_WEEKS = [12, 13, 14] as const;
export type RematchWeek = (typeof REMATCH_WEEKS)[number];

/** 12 teams × 3 weeks ÷ 2 teams per matchup. */
export const TOTAL_PICKS = 18;

/**
 * Final playoff standings, 1st → 12th, by Sleeper display name, keyed by the
 * season that produced them. Derived from the league's winners_bracket /
 * losers_bracket (league 1180096336035880960): the winners bracket settles
 * 1st–6th, and the losers (consolation) bracket settles 7th–12th.
 *
 * This is the feature's only annual maintenance — paste one array per year
 * and next season's draft opens itself.
 */
export const FINISH_BY_YEAR: Record<number, readonly string[]> = {
  2025: [
    "hnukala", // 1st — Harsha (champion)
    "aml200", // 2nd — Aditya
    "mukundc", // 3rd — Mukund
    "vijaysingh1194", // 4th — Vij/Sah/Kalp
    "omarels", // 5th — Omar
    "hs1", // 6th — Harish
    "sprtzfan17", // 7th — Hirsch (consolation winner, so he picks first)
    "Pingles", // 8th — Arun
    "ppradhan", // 9th — Pranav
    "KartikC", // 10th — Kartik
    "ari2jainz", // 11th — Ari
    "krishnaboy", // 12th — Murali
  ],
  // 2026: paste after the '26 consolation final.
};

/**
 * The order a season drafts in — the previous season's finish. Null when that
 * year hasn't been recorded yet, which the page turns into "no draft yet"
 * rather than a crash.
 */
export function finishOrderFor(seasonYear: number): readonly string[] | null {
  return FINISH_BY_YEAR[seasonYear - 1] ?? null;
}

export interface RematchPick {
  pickNumber: number;
  week: number;
  pickerManagerId: string;
  opponentManagerId: string;
}

/** One team's state on the board. */
export interface TeamSlots {
  managerId: string;
  /** Weeks already filled, in week order. */
  weeksUsed: number[];
  /** Manager ids already faced across the three weeks. */
  opponents: string[];
  /** Weeks still to be filled. */
  weeksOpen: number[];
}

export interface Matchup {
  /** The turn that produced this, or null when it was forced (see buildBoard). */
  pickNumber: number | null;
  week: number;
  pickerManagerId: string;
  opponentManagerId: string;
  /** Assigned by the board rather than chosen by a manager. */
  auto: boolean;
}

export interface Board {
  /** Per-team slots, keyed by manager id. */
  teams: Map<string, TeamSlots>;
  /** Matchups grouped by week, picks in pick order then forced fills. */
  byWeek: Map<number, Matchup[]>;
  /** The stored picks this board was folded from, in pick order. */
  picks: RematchPick[];
  /** How many of the 18 matchups are set, forced ones included. */
  made: number;
  complete: boolean;
}

export interface LegalPick {
  opponentManagerId: string;
  week: number;
  ok: boolean;
  /** Why this option is unavailable. Empty when `ok`. */
  reason: string;
}

/**
 * The snake turn order as a flat sequence of manager ids.
 *
 * Round 1 runs 7th → 12th, then 6th → 1st (so the consolation winner picks
 * first and the champion picks last); round 2 is that reversed; and so on.
 * Enough rounds are generated to cover every pick even when teams get skipped.
 *
 * @param finishOrder manager ids in finishing order, 1st → 12th.
 */
export function turnOrder(finishOrder: string[]): string[] {
  const n = finishOrder.length;
  const half = Math.floor(n / 2);
  // Indices into finishOrder: 6,7,8,9,10,11 then 5,4,3,2,1,0 for a 12-team league.
  const round: string[] = [];
  for (let i = half; i < n; i++) round.push(finishOrder[i]);
  for (let i = half - 1; i >= 0; i--) round.push(finishOrder[i]);

  const reversed = [...round].reverse();
  const sequence: string[] = [];
  // Three slots per team means a team can never pick more than 3 times, so
  // three rounds of each direction is always more than enough.
  for (let r = 0; r < 6; r++) {
    sequence.push(...(r % 2 === 0 ? round : reversed));
  }
  return sequence;
}

/**
 * Fold the picks made so far into per-team slots and a week-by-week board,
 * then fill in everything those picks already decided.
 *
 * A matchup is *forced* when an open (team, week) slot has exactly one legal
 * partner left: that pairing appears in every legal completion of the board, so
 * making somebody spend a turn clicking their only option is busywork. Filling
 * it changes nobody's legal options — a pick that contradicted it would leave
 * the board unsolvable, which `legalPicks` already refuses — it just means a
 * draft takes fewer than 18 picks, and greys the option out with "Week 14 is
 * already set for Ari" rather than a lookahead explanation.
 *
 * Forced fills cascade: filling one slot can leave another with a single
 * partner, so this runs to a fixpoint. They aren't stored — the board is always
 * the stored picks plus this closure, derived the same way everywhere — so they
 * consume nobody's turn.
 */
export function buildBoard(finishOrder: string[], picks: RematchPick[]): Board {
  const teams = new Map<string, TeamSlots>();
  for (const id of finishOrder) {
    teams.set(id, { managerId: id, weeksUsed: [], opponents: [], weeksOpen: [...REMATCH_WEEKS] });
  }

  const byWeek = new Map<number, Matchup[]>();
  for (const w of REMATCH_WEEKS) byWeek.set(w, []);

  const ordered = [...picks].sort((a, b) => a.pickNumber - b.pickNumber);

  function fill(
    pickNumber: number | null,
    week: number,
    pickerManagerId: string,
    opponentManagerId: string
  ) {
    for (const [self, other] of [
      [pickerManagerId, opponentManagerId],
      [opponentManagerId, pickerManagerId],
    ]) {
      const slots = teams.get(self);
      if (!slots) continue;
      slots.weeksUsed.push(week);
      slots.opponents.push(other);
      slots.weeksOpen = slots.weeksOpen.filter((w) => w !== week);
    }
    byWeek.get(week)?.push({
      pickNumber,
      week,
      pickerManagerId,
      opponentManagerId,
      auto: pickNumber === null,
    });
  }

  for (const p of ordered) {
    fill(p.pickNumber, p.week, p.pickerManagerId, p.opponentManagerId);
  }

  // The closure. A slot with no candidates at all means the board is already
  // dead — leave it alone and let canComplete() be the one to say so.
  for (let assigned = true; assigned; ) {
    assigned = false;
    outer: for (const managerId of finishOrder) {
      const mine = teams.get(managerId);
      if (!mine) continue;
      for (const week of mine.weeksOpen) {
        const candidates = finishOrder.filter((other) => {
          const theirs = teams.get(other);
          return (
            other !== managerId &&
            theirs !== undefined &&
            theirs.weeksOpen.includes(week) &&
            !mine.opponents.includes(other)
          );
        });
        if (candidates.length === 1) {
          fill(null, week, managerId, candidates[0]);
          assigned = true;
          break outer;
        }
      }
    }
  }

  for (const slots of teams.values()) slots.weeksUsed.sort((a, b) => a - b);

  // Derived from the slots rather than a pick count, so the engine stays
  // correct for any even number of teams (the tests use a 6-team fixture).
  const complete = [...teams.values()].every((s) => s.weeksOpen.length === 0);
  const made = [...byWeek.values()].reduce((n, ms) => n + ms.length, 0);

  return { teams, byWeek, picks: ordered, made, complete };
}

/**
 * Who is on the clock.
 *
 * Replays the draft: each pick consumes one position in the snake sequence,
 * and any team that is already full when its position comes up is skipped
 * without consuming a pick. "Full" has to be evaluated as of that moment in
 * the draft, not at the end — a team can be filled by three other teams
 * picking it before its own turn ever arrives, in which case it never picks.
 *
 * Returns null once every team has all three weeks set.
 */
export function onTheClock(finishOrder: string[], picks: RematchPick[]): string | null {
  const sequence = turnOrder(finishOrder);
  const ordered = [...picks].sort((a, b) => a.pickNumber - b.pickNumber);

  // "Full" is read off the board as it stood before each pick, so forced fills
  // count the same as picks: a team the closure finished never gets a turn.
  const isFull = (board: Board, id: string) =>
    (board.teams.get(id)?.weeksOpen.length ?? 0) === 0;

  let i = 0;
  for (let k = 0; k < ordered.length; k++) {
    const before = buildBoard(finishOrder, ordered.slice(0, k));
    while (i < sequence.length && isFull(before, sequence[i])) i++;
    i++; // This pick consumed that turn.
  }

  const now = buildBoard(finishOrder, ordered);
  while (i < sequence.length && isFull(now, sequence[i])) i++;
  return i < sequence.length ? sequence[i] : null;
}

/** Mutable search state used by the completability check. */
interface SearchState {
  ids: string[];
  used: Map<string, Set<number>>;
  faced: Map<string, Set<string>>;
}

function toSearchState(board: Board, finishOrder: string[]): SearchState {
  const used = new Map<string, Set<number>>();
  const faced = new Map<string, Set<string>>();
  for (const id of finishOrder) {
    const slots = board.teams.get(id);
    used.set(id, new Set(slots?.weeksUsed ?? []));
    faced.set(id, new Set(slots?.opponents ?? []));
  }
  return { ids: [...finishOrder], used, faced };
}

/**
 * Can the rest of the board still be filled legally?
 *
 * This matters more than it looks. Simulating 50,000 drafts of random *legal*
 * picks, 33.8% dead-ended: the last teams were left needing a week where their
 * only available partner was someone they'd already drafted. Offering only
 * picks that keep the board solvable removed every one of those (3,000/3,000
 * guarded drafts completed).
 *
 * Backtracking with an MRV heuristic — always expand the open (team, week)
 * slot with the fewest candidate partners, and fail the moment one has none.
 * The search space is tiny (12 teams, 3 weeks), so this settles in ~11ms worst
 * case on an empty board and well under a millisecond mid-draft.
 */
export function canComplete(board: Board, finishOrder: string[]): boolean {
  const state = toSearchState(board, finishOrder);

  function recurse(): boolean {
    let best: { team: string; week: number; candidates: string[] } | null = null;

    for (const team of state.ids) {
      for (const week of REMATCH_WEEKS) {
        if (state.used.get(team)!.has(week)) continue;
        const candidates = state.ids.filter(
          (other) =>
            other !== team &&
            !state.used.get(other)!.has(week) &&
            !state.faced.get(team)!.has(other)
        );
        if (candidates.length === 0) return false;
        if (best === null || candidates.length < best.candidates.length) {
          best = { team, week, candidates };
        }
      }
    }

    if (best === null) return true; // Every slot is filled.

    for (const other of best.candidates) {
      state.used.get(best.team)!.add(best.week);
      state.used.get(other)!.add(best.week);
      state.faced.get(best.team)!.add(other);
      state.faced.get(other)!.add(best.team);

      if (recurse()) return true;

      state.used.get(best.team)!.delete(best.week);
      state.used.get(other)!.delete(best.week);
      state.faced.get(best.team)!.delete(other);
      state.faced.get(other)!.delete(best.team);
    }
    return false;
  }

  return recurse();
}

/** The board as it would stand with one more pick on it. */
function withPick(
  board: Board,
  pickerManagerId: string,
  opponentManagerId: string,
  week: number
): Board {
  // Rebuilt from the stored picks, not from the matchups: the forced fills in
  // `byWeek` belong to no turn and are re-derived by buildBoard anyway.
  return buildBoard(
    [...board.teams.keys()],
    [
      ...board.picks,
      {
        pickNumber: board.picks.length + 1,
        week,
        pickerManagerId,
        opponentManagerId,
      },
    ]
  );
}

/**
 * Every (opponent, week) the team on the clock could take, each flagged with
 * whether it's legal and, if not, why — so the UI can grey the option out and
 * explain itself rather than silently hiding it.
 *
 * @param nameOf resolves a manager id to a display name for the reason text.
 * @param selfLabel names the picking team instead of addressing them as "you".
 *   Pass it when somebody is reading another team's options — the commish
 *   picking for whoever is on the clock — so the greyed-out cards say
 *   "Arun's Week 12 is already set" rather than "Your Week 12 is already set".
 */
export function legalPicks(
  finishOrder: string[],
  picks: RematchPick[],
  pickerManagerId: string,
  nameOf: (managerId: string) => string = (id) => id,
  selfLabel?: string
): LegalPick[] {
  const board = buildBoard(finishOrder, picks);
  const mine = board.teams.get(pickerManagerId);
  const out: LegalPick[] = [];
  if (!mine) return out;

  for (const opponentManagerId of finishOrder) {
    for (const week of REMATCH_WEEKS) {
      const deny = (reason: string) =>
        out.push({ opponentManagerId, week, ok: false, reason });

      if (opponentManagerId === pickerManagerId) {
        deny(
          selfLabel
            ? `${selfLabel} can't play themselves.`
            : "You can't play yourself."
        );
        continue;
      }
      if (mine.weeksUsed.includes(week)) {
        deny(
          selfLabel
            ? `${selfLabel}'s Week ${week} is already set.`
            : `Your Week ${week} is already set.`
        );
        continue;
      }
      if (mine.opponents.includes(opponentManagerId)) {
        const already = mine.weeksUsed[mine.opponents.indexOf(opponentManagerId)];
        deny(
          selfLabel
            ? `Already ${selfLabel}'s Week ${already} opponent.`
            : `Already your Week ${already} opponent.`
        );
        continue;
      }
      const theirs = board.teams.get(opponentManagerId);
      if (!theirs || theirs.weeksUsed.includes(week)) {
        deny(`Week ${week} is already set for ${nameOf(opponentManagerId)}.`);
        continue;
      }

      // The lookahead: would taking this leave the rest of the board unsolvable?
      const after = withPick(board, pickerManagerId, opponentManagerId, week);
      if (!canComplete(after, finishOrder)) {
        deny("This would leave someone with no legal opponent later.");
        continue;
      }

      out.push({ opponentManagerId, week, ok: true, reason: "" });
    }
  }

  return out;
}
