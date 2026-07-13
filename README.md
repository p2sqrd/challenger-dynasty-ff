# Challenger Dynasty FF

Web app replacing the manual Google Sheet for the Challenger Fantasy Football
dynasty/keeper league (Sleeper league `1180096336035880960`). Next.js +
TypeScript, Supabase (Postgres + auth), deployed on Vercel.

Phase 1: auth, manager accounts, historical `draft_records`, keeper selection
→ validation → commissioner approval → checklist, and the budget ledger.
Phase 2: trade auto-import from Sleeper, cash entry, commissioner approval,
and tradeback warnings. Live standings sync (Phase 3) is still a static
page — see the comment in `src/app/(app)/page.tsx`.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment variables** — copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — from
     your Supabase project's Settings → Data API / API Keys.
   - `SUPABASE_SECRET_KEY` — same page, "Secret keys" section. Server-only,
     never exposed to the browser.
   - `SLEEPER_LEAGUE_ID` — defaults to this league's real ID.

3. **Run the database migration** against your Supabase project (via the SQL
   editor in the dashboard, or the Supabase CLI):
   ```
   supabase/migrations/0001_init.sql
   ```

4. **Seed managers from Sleeper**:
   ```bash
   npx tsx scripts/seed-managers.ts
   ```
   This creates one `managers` row per Sleeper league member, matching
   `sprtzfan17` to `role: commissioner` and everyone else to `role: manager`.
   Sleeper doesn't expose real email addresses, so everyone is seeded with a
   `@placeholder.invalid` email — **update each manager's `email` column in
   Supabase to their real address** before magic-link login will work for
   them.

5. **Backfill historical draft prices**:
   ```bash
   npx tsx scripts/backfill-draft-records.ts
   ```
   Walks Sleeper's `previous_league_id` chain and pulls every season's
   auction/keeper picks with their real prices into `draft_records`. Run
   `seed-managers.ts` first — picks are matched to managers by Sleeper user
   ID. Known gap: mid-season waiver pickups aren't in Sleeper's draft-picks
   endpoint, so those don't get backfilled automatically (the keeper
   selection screen has a manual-entry fallback for players missing a prior
   season price).

6. **Open the season for keeper selection**:
   ```bash
   npx tsx scripts/create-season.ts --year 2026 --budget 200
   ```
   Run this once a year when it's time for managers to start submitting
   keepers.

7. **Seed each manager's trade-adjusted auction budget** for the season:
   ```bash
   npx tsx scripts/seed-2026-budgets.ts
   ```
   Everyone starts at $200, adjusted by the prior season's cash trades (from
   the "Draft Math" sheet) — e.g. Pranav's $177. This is a one-time backfill
   of the opening position; going forward, in-app trades accumulate in the
   ledger and set the next year's number automatically. Keeper spending is
   validated against this per-manager budget and the 16-man roster (you can
   keep players as long as $1 remains for every open spot).

8. **Sync trades from Sleeper** (once the season's draft has happened and
   managers start trading):
   ```bash
   npx tsx scripts/sync-trades.ts
   ```
   Pulls completed trade transactions into `trades` and `trade_sides` as
   `pending_cash`, matched to managers by Sleeper roster ID. Safe to re-run —
   already-imported trades are skipped. `SLEEPER_LEAGUE_ID` must point at the
   Sleeper league object for the season currently open in this app; update it
   once Sleeper's commissioner tools roll the league over to a new season.

9. **Run it**:
   ```bash
   npm run dev
   ```

## Testing

The rules engine (keeper pricing, budget floor/ceiling, tradeback detection)
is pure functions with unit tests:
```bash
npm test
```

## Project structure

- `src/lib/rules/` — pure, unit-tested rules engine (keeper pricing, budget
  validation, tradeback detection). No I/O.
- `src/lib/sleeper/` — typed Sleeper API client.
- `src/lib/supabase/` — browser/server/admin Supabase clients.
- `supabase/migrations/` — schema.
- `scripts/` — one-off/annual data seeding scripts (not part of the app's
  request lifecycle).
- `src/app/(app)/` — authenticated pages (standings, trades, keepers, budget,
  rules, archive); `src/app/login` and `src/app/auth` sit outside the auth
  gate.
- `src/app/api/keepers/` — keeper submission and commissioner
  approve/reject endpoints. All writes go through these (service-role)
  routes rather than client-side inserts — see the comment atop
  `supabase/migrations/0001_init.sql` for why.
- `src/app/api/trades/` — cash entry (manager) and approve/reject
  (commissioner) endpoints. Same service-role pattern as keepers.
