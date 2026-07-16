import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getAllPlayers } from "@/lib/sleeper/client";

/**
 * Resolve Sleeper player ids to display names, reading from our cached
 * `players` table instead of downloading Sleeper's ~5MB /players/nfl dump on
 * every page load. Any ids not found in the cache (e.g. a brand-new player
 * added since the last refresh, or before the cache is populated at all) fall
 * back to the Sleeper dump, so this is always correct — just faster once the
 * cache is warm. Refresh the cache with scripts/refresh-players.ts.
 */
export async function getPlayerNames(
  supabase: SupabaseClient<Database>,
  ids: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(ids)].filter(Boolean);
  const names = new Map<string, string>();
  if (unique.length === 0) return names;

  try {
    const { data, error } = await supabase
      .from("players")
      .select("player_id, full_name")
      .in("player_id", unique);
    if (!error && data) {
      for (const p of data) names.set(p.player_id, p.full_name);
    }
  } catch {
    // Cache table missing (pre-migration) — fall through to Sleeper below.
  }

  const missing = unique.filter((id) => !names.has(id));
  if (missing.length > 0) {
    try {
      const all = await getAllPlayers();
      for (const id of missing) {
        const p = all[id];
        names.set(
          id,
          (p?.full_name ||
            `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() ||
            id) as string
        );
      }
    } catch {
      for (const id of missing) names.set(id, id);
    }
  }

  return names;
}
