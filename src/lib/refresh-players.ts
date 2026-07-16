import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Refresh the `players` name cache from Sleeper's full player dump. Fetches
 * fresh (bypassing any cache) and upserts every named player, so page loads
 * can resolve names from our DB instead of re-downloading ~5MB each time.
 * Run daily (scripts/refresh-players.ts / the cron route).
 */
export async function refreshPlayers(
  supabase: SupabaseClient<Database>
): Promise<number> {
  const res = await fetch("https://api.sleeper.app/v1/players/nfl", {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Sleeper /players/nfl failed: ${res.status}`);
  }
  const all = (await res.json()) as Record<
    string,
    {
      full_name?: string;
      first_name?: string;
      last_name?: string;
      position?: string;
      team?: string;
    }
  >;

  const rows = [];
  for (const [id, p] of Object.entries(all)) {
    const name =
      p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
    if (!name) continue;
    rows.push({
      player_id: id,
      full_name: name,
      position: p.position ?? null,
      team: p.team ?? null,
    });
  }

  const BATCH = 1000;
  let count = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("players")
      .upsert(chunk, { onConflict: "player_id" });
    if (error) throw error;
    count += chunk.length;
  }
  return count;
}
