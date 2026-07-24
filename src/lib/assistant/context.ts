import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getLeagueRosters } from "@/lib/sleeper/client";
import { getPlayerNames } from "@/lib/players";
import { LEAGUE_RULES } from "./rules";

/**
 * Builds the context the AI assistant is allowed to see for a given manager.
 *
 * PRIVACY BOUNDARY — this is the whole point of the function. The assistant
 * runs on a free LLM tier that may train on inputs, so we send it ONLY public
 * / in-league-visible data and NEVER anything private:
 *
 *   ✅ allowed: the league rules, and this manager's own current Sleeper
 *      roster (rosters are already visible to the whole league on Sleeper).
 *   ❌ never sent: the `keepers` table (anyone's picks), keeper prices, auction
 *      budgets, or budget-vs-keeper math. This function does not read any of
 *      those tables, so keeper strategy cannot leak no matter what is asked.
 *
 * Keep this allow-list tight. If you add a data source here, confirm it is
 * public/in-league-visible before it goes to the free tier.
 */
export async function buildAssistantContext(
  supabase: SupabaseClient<Database>,
  manager: { id: string; display_name: string; sleeper_roster_id: number }
): Promise<string> {
  const parts: string[] = [LEAGUE_RULES];

  // The asker's own current roster (player names only). Best-effort — a Sleeper
  // hiccup just means the assistant answers without roster context.
  try {
    const leagueId = process.env.SLEEPER_LEAGUE_ID;
    if (leagueId) {
      const rosters = await getLeagueRosters(leagueId);
      const playerIds =
        rosters.find((r) => r.roster_id === manager.sleeper_roster_id)
          ?.players ?? [];
      if (playerIds.length > 0) {
        const names = await getPlayerNames(supabase, playerIds);
        const roster = playerIds
          .map((id) => names.get(id) ?? id)
          .sort((a, b) => a.localeCompare(b));
        parts.push(
          `THE MANAGER YOU ARE ADVISING:\n${manager.display_name}'s current roster (${roster.length} players):\n- ${roster.join("\n- ")}`
        );
      }
    }
  } catch {
    // No roster context available — proceed with rules only.
  }

  return parts.join("\n\n");
}
