# Starting a new season

What has to happen to roll the app from one season to the next, in order.
Examples use 2027; substitute the year you're opening.

Scripts read env from **`.env`**, not `.env.local` — they start with
`import "dotenv/config"`, which only loads `.env`. Next.js reads `.env.local`,
so if that's the only file you have, every script exits with
`NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set`. Copy the two
values across, or pass them inline.

## 1. Close the season that just ended

In Supabase, set the 2026 `seasons` row to `status = 'closed'`.

Nothing in the app does this for you, and it isn't optional: **31 queries** load
the current season with `.eq("status", "active")` followed by `.single()` or
`.maybeSingle()`. Two active rows breaks Budget, Keepers, Rankings, Commish and
the Rematch Draft at once. Close the old season before (or in the same sitting
as) opening the new one.

## 2. Open the new season

```bash
npx tsx scripts/create-season.ts --year 2027 --budget 200
```

Upserts on `year` and sets `status = 'active'`. Safe to re-run.

## 3. Point Sleeper at the new league

Update `SLEEPER_LEAGUE_ID` (env, and Vercel) once Sleeper's commissioner tools
roll the league over. `sync-trades.ts` and the backfills all walk from it.

**Order matters here.** `scripts/backfill-draft-records.ts` upserts *every*
season in Sleeper's `previous_league_id` chain as
`{ starting_budget: 200, status: "closed" }`. Run it after the new league has a
draft and it will flip the season you just opened back to `closed` and reset its
budget. Either run it before step 2, or re-open the season afterwards.

## 4. Seed the starting budgets

Everyone starts at $200, adjusted by the net cash from the prior season's
trades, kept inside the league's $125–$275 band. Those go into `budget_ledger`
as rows with `reason = 'starting_budget'` (plus `reason = 'trade'` rows for the
itemised breakdown the Budget page shows).

**There is no generic script for this yet.** `scripts/seed-2026-budgets.ts` and
`seed-2026-trades.ts` are one-time backfills of hardcoded numbers from the 2026
Draft Math spreadsheet, from before the app tracked trades itself. For 2027 the
numbers should come out of the app's own 2026 ledger, so this needs either a new
script modelled on those two or the rows entered by hand.

Until those rows exist the app still works: `getManagerAuctionBudget()`
(`src/lib/budget.ts`) falls back to the season's flat `starting_budget`, so
everyone simply shows $200.

## 5. Set the deadlines

`/commish` → **Deadlines**: keeper deadline and draft time. Saving updates
everyone's countdowns, and keepers lock automatically when the deadline passes.

A manager who needs to edit after the lock gets `managers.keepers_unlocked =
true` — a per-manager override, set in Supabase.

## 6. Rematch Draft: paste last season's finishing order

```ts
// src/lib/rematch-draft.ts
export const FINISH_BY_YEAR: Record<number, readonly string[]> = {
  2025: [...],
  2026: ["…"], // ← 1st → 12th, by Sleeper display name
};
```

`finishOrderFor(2027)` reads `FINISH_BY_YEAR[2026]` — the 2027 draft runs off
how 2026 ended, champion picking last. Read it off the league's
`winners_bracket` (1st–6th) and `losers_bracket` (7th–12th). Names must match
`managers.display_name` exactly.

That's the whole setup: the board itself is created by the first person to open
`/rematch-draft`. Move the nav item back to top level in
`src/components/Nav.tsx` (it gets parked under "More" once a board is full), and
see [rematch-draft.md](rematch-draft.md) for the rest.

## 7. Fire sales

`FIRE_SALE_CREATION_LOCKED` in `src/lib/fire-sale.ts` gates new sales. It should
be `true` through the run-up to the auction, and flipped to `false` once the
draft is done.

## 8. After the auction

```bash
npx tsx scripts/backfill-draft-records.ts   # mind the warning in step 3
```

Pulls the new season's auction prices into `draft_records`, which is what next
year's keeper pricing reads. Idempotent — it upserts on
`(season_id, manager_id, player_id)`.

Known gap it doesn't cover: mid-season waiver pickups aren't in Sleeper's
draft-picks endpoint, so their prices don't come across. The keeper screen has a
manual-entry fallback for players missing a prior-season price, and
`scripts/backfill-waiver-costs.ts` handles the rest.

`scripts/sync-trades.ts` then runs through the season to import completed trades
as `pending_cash`. Safe to re-run; already-imported trades are skipped.
