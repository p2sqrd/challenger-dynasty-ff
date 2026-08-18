# Rematch Draft

The league has 12 teams but a 14-week regular season. Weeks 1–11 give everyone
11 unique opponents; weeks 12, 13 and 14 are repeats. Those three repeat
matchups are drafted in the app.

**The board opens itself.** There is no script to run, no button to press and
no env var to hold: the first person to open `/rematch-draft` in a season
creates that season's board and lands in it. Everyone after that walks into the
same room.

## The rules the app enforces

- **Snake order by reverse playoff finish.** The consolation-bracket winner
  (7th) picks first, the champion (1st) picks last. Round 1 runs 7th → 12th
  then 6th → 1st; round 2 is that reversed, and so on.
- **A pick is `(opponent, week)`** and fills that week for *both* teams. So a
  12-team board is exactly 18 matchups (12 × 3 ÷ 2), not 36 — and fewer than 18
  picks, since forced matchups fill themselves (below).
- **A team whose three weeks are full is skipped** when its turn comes around.
  It can be filled entirely by other teams picking it, in which case it never
  picks at all.
- **Illegal:** yourself; a team you already face in one of the other two weeks;
  a week either side has already filled.
- **You are always yourself.** There is no picking on another team's behalf,
  anywhere in the app.

## Forced matchups assign themselves

If an open `(team, week)` slot has exactly one legal opponent left, that pairing
is in every legal completion of the board — nobody is choosing anything by
clicking it. So the board fills it in, and keeps going while filling one slot
leaves another with a single option. The last matchup of a week is the common
case; a team that has already drawn everyone else in its other weeks is the
other.

This can't change anyone's options: a pick that contradicted a forced pairing
would leave the board unsolvable, and the lookahead guard below already refuses
those. What it changes is that a draft costs about 15 picks rather than 18, and
that a card greys out with "Week 14 is already set for Ari" instead of a
lookahead explanation. Auto-assigned matchups show as `auto` in the week cards
rather than a pick number.

Forced matchups are **derived, not stored**: `rematch_picks` holds real picks
only, and the board — the one the room renders and the one the pick route
validates against — is those picks plus this closure, computed by the same
function on both sides. So a finished draft has ~15 rows in the table and 18
matchups on the board, and no auto-fill ever consumes somebody's turn, because
it isn't a row that the clock can count.

## The load-bearing part: the lookahead guard

The closure above fills in what's already decided. The guard is the other half:
it stops a *free* choice from making the board unsolvable in the first place.

Picking only *legal* moves is not enough to finish the board. Simulating 50,000
drafts of random legal picks, **33.8% dead-ended** — the last teams left
needing a week whose only available partner was someone they'd already drafted.

So `legalPicks()` runs a completability check on every candidate: apply the
pick, then backtrack-search (MRV heuristic — always expand the open
`(team, week)` slot with the fewest candidate partners) to see whether the rest
of the board can still be filled. Anything that strands the board is greyed out
with *"This would leave someone with no legal opponent later."*

With the guard on, 2,000/2,000 simulated drafts completed, worst case ~6ms per
turn. `src/lib/rematch-draft.test.ts` locks it in: a full guarded draft always
ends with 18 matchups, three distinct opponents per team, one per week.

The guard runs again **server-side** in the pick route — the client's idea of
what's legal is never trusted.

## Turn order is enforced by the database

`unique (draft_id, pick_number)` on `rematch_picks` is the latch. The pick route
claims turn N by inserting `pick_number = N`. If someone else's pick landed
between our read and our insert, we lose the race with a `23505` and the caller
gets a **409 "Someone just picked — the board moved. Try again."** rather than
silently taking a turn that was validated against a stale board.

(Different from the Fire Sale, where a lost race degrades into the seller
breaking a tie by hand. Here draft order genuinely matters.)

The same constraint idea opens the board: `rematch_drafts_live_idx` is unique on
`season_id`, so if two people first-load the page at the same moment, the loser
of the insert race re-reads the winner's board instead of creating a second one.

## Notifications

Every pick sends the next team up an in-app notification, plus an email when
SMTP is configured. **The first pick is the exception** — the ping fires *after*
a pick, for whoever is next, so nobody is told the draft has started. Tell the
7th-place finisher to open it.

## Running it next year

One thing to do, once a year, after the consolation final:

```ts
// src/lib/rematch-draft.ts
export const FINISH_BY_YEAR: Record<number, readonly string[]> = {
  2025: ["hnukala", "aml200", /* … */ "krishnaboy"],
  2026: ["…"], // ← paste 1st → 12th, by Sleeper display name
};
```

Names are Sleeper display names and must match `managers.display_name`. The
2027 draft reads the 2026 array (`finishOrderFor(2027)` → `FINISH_BY_YEAR[2026]`).

Until that array exists, `/rematch-draft` says so instead of crashing. A name
that doesn't match a manager row aborts before anything is written, naming the
offender — no half-built board.

The 2025 order, for reference, read off the league's `winners_bracket` /
`losers_bracket` (winners settles 1st–6th, consolation 7th–12th):

| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|----|----|----|
| hnukala | aml200 | mukundc | vijaysingh1194 | omarels | hs1 | sprtzfan17 | Pingles | ppradhan | KartikC | ari2jainz | krishnaboy |

So the 2026 pick order, first to last, is: sprtzfan17, Pingles, ppradhan,
KartikC, ari2jainz, krishnaboy, hs1, omarels, vijaysingh1194, mukundc, aml200,
hnukala — then back the other way for round 2.

## When the draft is over

`src/components/Nav.tsx` has Rematch Draft as a top-level item with a comment
saying so: move it into `archiveExtras` ("More") once the board is full.

## Rehearsing a change

The rules engine is pure, so a draft can be run end to end with no database at
all: a throwaway client page renders the real `<RematchDraftRoom>` against an
in-memory board, with a `fetch` shim standing in for the two API routes and the
actor always set to whoever is on the clock, so one person clicks the whole
draft through.
That page is written when it's needed and deleted after — deliberately not
committed, so production code never carries a test mode.

## Where the code lives

| Path | What it does |
|---|---|
| `src/lib/rematch-draft.ts` | Pure rules engine — the finishing orders, snake order, board folding, on-the-clock, legality, the completability search. No I/O. |
| `src/lib/rematch-load.ts` | Opens the season's board (`ensureSeasonDraft`) and builds the view model, so the client's board and the server's validation come from the same code. |
| `src/app/api/rematch-draft/[id]/pick/route.ts` | Re-validates server-side, claims the turn, notifies the next team. |
| `src/app/api/rematch-draft/[id]/state/route.ts` | Board poll (~3s), returns the derived view including legal picks. |
| `src/app/(app)/rematch-draft/` | Opens-or-redirects entry page, plus the room. |
| `src/components/RematchDraftRoom.tsx` | The room UI. |
| `supabase/migrations/0018_rematch_draft.sql` | Tables, the one-board-per-season index, the turn latch, RLS. |

`rematch_drafts.is_test` is a dead column from the first cut of this feature,
which had rehearsal boards inside the app. Nothing writes it any more; it stays
only because the partial index that enforces one board per season is defined
against it.
