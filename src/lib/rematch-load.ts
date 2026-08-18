import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  REMATCH_WEEKS,
  buildBoard,
  legalPicks,
  onTheClock,
  type LegalPick,
  type RematchPick,
} from "@/lib/rematch-draft";

/**
 * Shared loader for the Rematch Draft room. Both the /state poll endpoint and
 * the pick route go through this, so the board the client renders and the
 * board the server validates against are built by the same code.
 */

export interface DraftTeamView {
  managerId: string;
  /** Sleeper display name — feed it to <Nameplate alias={…}>. */
  alias: string;
  /** Finishing place, 1-indexed. */
  finish: number;
  weeksUsed: number[];
  weeksOpen: number[];
  opponents: string[];
}

export interface DraftMatchupView {
  pickNumber: number;
  week: number;
  pickerId: string;
  pickerAlias: string;
  opponentId: string;
  opponentAlias: string;
}

export interface DraftStateView {
  id: string;
  label: string;
  isTest: boolean;
  weeks: number[];
  teams: DraftTeamView[];
  byWeek: { week: number; matchups: DraftMatchupView[] }[];
  history: DraftMatchupView[];
  made: number;
  total: number;
  complete: boolean;
  onTheClockId: string | null;
  onTheClockAlias: string | null;
  /** The manager the caller is picking as (themselves, unless acting-as). */
  actingAsId: string | null;
  canPick: boolean;
  /** Only populated when the caller is the one on the clock. */
  legal: LegalPick[];
}

export interface LoadedDraft {
  draft: Database["public"]["Tables"]["rematch_drafts"]["Row"];
  picks: RematchPick[];
  order: string[];
  aliasOf: (managerId: string) => string;
}

/** Fetch the draft, its picks, and a manager-id → display-name resolver. */
export async function loadDraft(
  admin: SupabaseClient<Database>,
  draftId: string
): Promise<LoadedDraft | null> {
  const { data: draft } = await admin
    .from("rematch_drafts")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();
  if (!draft) return null;

  const [{ data: rows }, { data: managers }] = await Promise.all([
    admin
      .from("rematch_picks")
      .select("pick_number, week, picker_manager_id, opponent_manager_id")
      .eq("draft_id", draftId)
      .order("pick_number"),
    admin.from("managers").select("id, display_name"),
  ]);

  const nameById = new Map((managers ?? []).map((m) => [m.id, m.display_name]));

  return {
    draft,
    order: draft.order_manager_ids ?? [],
    picks: (rows ?? []).map((r) => ({
      pickNumber: r.pick_number,
      week: r.week,
      pickerManagerId: r.picker_manager_id,
      opponentManagerId: r.opponent_manager_id,
    })),
    aliasOf: (managerId: string) => nameById.get(managerId) ?? "—",
  };
}

/**
 * Which team the caller is picking as.
 *
 * On a live draft: always themselves — the acting-as parameter is ignored, so
 * nobody can pick for another team. On a test draft: any team, or the literal
 * "auto" to follow whoever is on the clock, which is what makes clicking
 * through all 18 picks in one sitting practical.
 */
export function resolveActingAs(
  loaded: LoadedDraft,
  managerId: string,
  actAs: string | null | undefined
): string | null {
  if (!loaded.draft.is_test || !actAs) return managerId;
  if (actAs === "auto") return onTheClock(loaded.order, loaded.picks);
  return loaded.order.includes(actAs) ? actAs : managerId;
}

/**
 * Derive everything the room renders. `actingAsId` is the team the caller is
 * picking as — their own manager id on a live draft, or any team on a test
 * draft (validated by the caller, not here).
 */
export function toStateView(
  loaded: LoadedDraft,
  actingAsId: string | null
): DraftStateView {
  const { draft, order, picks, aliasOf } = loaded;
  const board = buildBoard(order, picks);
  const clockId = onTheClock(order, picks);

  const matchup = (p: RematchPick): DraftMatchupView => ({
    pickNumber: p.pickNumber,
    week: p.week,
    pickerId: p.pickerManagerId,
    pickerAlias: aliasOf(p.pickerManagerId),
    opponentId: p.opponentManagerId,
    opponentAlias: aliasOf(p.opponentManagerId),
  });

  const canPick = actingAsId !== null && actingAsId === clockId && !board.complete;

  return {
    id: draft.id,
    label: draft.label,
    isTest: draft.is_test,
    weeks: [...REMATCH_WEEKS],
    teams: order.map((managerId, i) => {
      const slots = board.teams.get(managerId);
      return {
        managerId,
        alias: aliasOf(managerId),
        finish: i + 1,
        weeksUsed: slots?.weeksUsed ?? [],
        weeksOpen: slots?.weeksOpen ?? [],
        opponents: (slots?.opponents ?? []).map(aliasOf),
      };
    }),
    byWeek: [...REMATCH_WEEKS].map((week) => ({
      week,
      matchups: (board.byWeek.get(week) ?? []).map(matchup),
    })),
    history: [...picks].sort((a, b) => a.pickNumber - b.pickNumber).map(matchup),
    made: board.made,
    total: (order.length * REMATCH_WEEKS.length) / 2,
    complete: board.complete,
    onTheClockId: clockId,
    onTheClockAlias: clockId ? aliasOf(clockId) : null,
    actingAsId,
    canPick,
    legal: canPick ? legalPicks(order, picks, actingAsId, aliasOf) : [],
  };
}
