import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, RankingEntry, RankingKind } from "@/types/database";
import { getManagerAuctionBudget } from "@/lib/budget";
import { getPlayerPositions } from "@/lib/players";
import { resolveTeam } from "@/lib/teams";

export type { RankingEntry, RankingKind };

/** A kept player on a ranking card's roster board. */
export interface KeptPlayer {
  playerId: string;
  name: string;
  position: string | null;
  price: number;
}

/**
 * Everything one manager's ranking card needs, most of it derived live rather
 * than stored: their money strip, their kept players, and the author-entered
 * draft needs + explanation. Kept players (and therefore keeper spend and
 * remaining budget) are only present when the viewer is allowed to see them —
 * their own team always, everyone's once the keeper deadline passes.
 */
export interface ManagerCard {
  managerId: string;
  name: string;
  /** Trade-adjusted auction budget the manager brings in. */
  startingBudget: number;
  /** Sum of kept players' keeper prices, or null when picks are hidden. */
  keeperSpend: number | null;
  /** startingBudget − keeperSpend, or null when picks are hidden. */
  remaining: number | null;
  /** Whether this viewer may see this manager's kept players yet. */
  keptVisible: boolean;
  kept: KeptPlayer[];
  draftNeeds: string[];
  explanation: string;
}

interface Season {
  id: string;
  starting_budget: number;
  keeper_deadline: string | null;
}

interface LoadOptions {
  /** When keepers live on a different season (e.g. prior season after a
   *  rollover), pass that season's id so the roster board reads them. */
  keeperSeasonId?: string;
}

/**
 * Build the per-team ranking cards for the active season, in ranked order.
 * Shared by both boards (post-keeper and post-draft) — the roster/budget
 * context is the same; only the saved `entries` (order, needs, blurb) differ.
 *
 * Ordering comes from the saved `entries` (authors' drag-drop order); any
 * active manager not yet placed is appended, ordered by starting budget. All
 * per-manager money and kept-player data is computed here from the live
 * keepers + budget ledger, so a card can never store or leak a pick early:
 * keepers are read through the caller's RLS-bound client, which only returns
 * the viewer's own picks until the keeper deadline, then everyone's.
 */
export async function loadRankingCards(
  supabase: SupabaseClient<Database>,
  season: Season,
  viewerManagerId: string | null,
  entries: RankingEntry[],
  opts: LoadOptions = {}
): Promise<ManagerCard[]> {
  const keeperSeason = opts.keeperSeasonId ?? season.id;
  // Active managers this season = those with a budget entry (drops departed
  // members), matching the Budget / League Keepers views.
  const [{ data: managers }, { data: ledger }, { data: keepers }] =
    await Promise.all([
      supabase.from("managers").select("id, display_name"),
      supabase.from("budget_ledger").select("manager_id").eq("season_id", season.id),
      supabase
        .from("keepers")
        .select("manager_id, player_id, player_name, new_price")
        .eq("season_id", keeperSeason),
    ]);

  const activeIds = new Set((ledger ?? []).map((l) => l.manager_id));
  const activeManagers = (managers ?? []).filter((m) => activeIds.has(m.id));

  const now = Date.now();
  const deadlinePassed =
    season.keeper_deadline != null &&
    new Date(season.keeper_deadline).getTime() <= now;

  const keptByManager = new Map<string, KeptPlayer[]>();
  for (const k of keepers ?? []) {
    const list = keptByManager.get(k.manager_id) ?? [];
    list.push({
      playerId: k.player_id,
      name: k.player_name,
      position: null,
      price: k.new_price,
    });
    keptByManager.set(k.manager_id, list);
  }

  // Positions for every kept player we can actually see, for the roster board.
  const keptIds = [...keptByManager.values()].flat().map((p) => p.playerId);
  const positions = await getPlayerPositions(supabase, keptIds);
  for (const list of keptByManager.values()) {
    for (const p of list) p.position = positions.get(p.playerId) ?? null;
  }

  const entryByManager = new Map(entries.map((e) => [e.managerId, e]));

  const cards: ManagerCard[] = await Promise.all(
    activeManagers.map(async (m) => {
      const startingBudget = await getManagerAuctionBudget(
        supabase,
        season.id,
        m.id,
        season.starting_budget
      );
      const keptVisible = deadlinePassed || m.id === viewerManagerId;
      const kept = (keptByManager.get(m.id) ?? []).sort(
        (a, b) => b.price - a.price || a.name.localeCompare(b.name)
      );
      const keeperSpend = keptVisible
        ? kept.reduce((sum, p) => sum + p.price, 0)
        : null;
      const entry = entryByManager.get(m.id);
      return {
        managerId: m.id,
        name: resolveTeam(m.display_name).name,
        startingBudget,
        keeperSpend,
        remaining: keeperSpend === null ? null : startingBudget - keeperSpend,
        keptVisible,
        kept: keptVisible ? kept : [],
        draftNeeds: entry?.draftNeeds ?? [],
        explanation: entry?.explanation ?? "",
      };
    })
  );

  // Ranked order first (entries), then any unplaced manager by budget desc.
  const rank = new Map(entries.map((e, i) => [e.managerId, i]));
  cards.sort((a, b) => {
    const ra = rank.get(a.managerId);
    const rb = rank.get(b.managerId);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return b.startingBudget - a.startingBudget || a.name.localeCompare(b.name);
  });

  return cards;
}
