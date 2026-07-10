/**
 * Seeds the `managers` table from Sleeper's league users + rosters, per
 * spec section 2. Run with: npx tsx scripts/seed-managers.ts
 *
 * Requires SLEEPER_LEAGUE_ID, NEXT_PUBLIC_SUPABASE_URL, and
 * SUPABASE_SECRET_KEY in .env.local. Managers seeded here have a placeholder
 * email derived from their Sleeper display name if Sleeper doesn't expose a
 * real one (it doesn't) — the commissioner should update each manager's row
 * with their real email before magic-link auth is usable, since Supabase
 * auth identifies users by email.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { getLeagueRosters, getLeagueUsers } from "../src/lib/sleeper/client";
import type { Database } from "../src/types/database";

const COMMISSIONER_DISPLAY_NAME = "sprtzfan17";

async function main() {
  const leagueId = process.env.SLEEPER_LEAGUE_ID;
  if (!leagueId) throw new Error("SLEEPER_LEAGUE_ID is not set");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set"
    );
  }

  const supabase = createClient<Database>(supabaseUrl, secretKey);

  const [users, rosters] = await Promise.all([
    getLeagueUsers(leagueId),
    getLeagueRosters(leagueId),
  ]);

  const rosterByOwner = new Map(rosters.map((r) => [r.owner_id, r.roster_id]));

  const rows = users
    .filter((user) => rosterByOwner.has(user.user_id))
    .map((user) => {
      const rosterId = rosterByOwner.get(user.user_id)!;
      const isCommissioner = user.display_name === COMMISSIONER_DISPLAY_NAME;
      return {
        sleeper_user_id: user.user_id,
        sleeper_roster_id: rosterId,
        display_name: user.display_name,
        email: `${user.display_name}@placeholder.invalid`,
        role: isCommissioner ? ("commissioner" as const) : ("manager" as const),
      };
    });

  console.log(`Seeding ${rows.length} managers...`);

  const { error } = await supabase
    .from("managers")
    .upsert(rows, { onConflict: "sleeper_user_id" });

  if (error) throw error;

  console.log("Done. Update each manager's `email` column with their real");
  console.log("address before magic-link auth will work for them.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
