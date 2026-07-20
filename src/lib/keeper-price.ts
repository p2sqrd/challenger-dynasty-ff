import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { computeKeeperPrice } from "@/lib/rules/keeper-pricing";

/**
 * The keeper cost of each requested player for a given upcoming-season year —
 * i.e. what it would cost to keep them into that season's auction. It's
 * derived from the immediately-prior season's draft record, exactly like the
 * Keepers page (a keeper's salary follows the player across trades, so we key
 * off the player's own prior record, not who currently rosters them).
 *
 * Players with no prior-season record (e.g. added off waivers with no draft
 * row, or brand-new) are omitted from the map — their keeper price isn't
 * determined until it's entered on the Keepers page. The drafted-and-dropped
 * override also needs manual input there, so this is the standard-rules
 * estimate; it matches the Keepers page for every player that has a plain
 * prior record.
 */
export async function getKeeperPrices(
  supabase: SupabaseClient<Database>,
  upcomingSeasonYear: number,
  playerIds: string[]
): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  const unique = [...new Set(playerIds)].filter(Boolean);
  if (unique.length === 0) return prices;

  const { data: priorSeason } = await supabase
    .from("seasons")
    .select("id")
    .eq("year", upcomingSeasonYear - 1)
    .maybeSingle();
  if (!priorSeason) return prices;

  const { data: records } = await supabase
    .from("draft_records")
    .select("player_id, price, source")
    .eq("season_id", priorSeason.id)
    .in("player_id", unique);

  for (const r of records ?? []) {
    const { newPrice } = computeKeeperPrice({
      priorRecord: { price: r.price, source: r.source },
    });
    prices.set(r.player_id, newPrice);
  }
  return prices;
}
