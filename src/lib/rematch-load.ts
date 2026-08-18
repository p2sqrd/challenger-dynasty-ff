import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  REMATCH_WEEKS,
  buildBoard,
  finishOrderFor,
  legalPicks,
  onTheClock,
  type LegalPick,
  type Matchup,
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
  /** null when the board assigned this itself — see buildBoard's closure. */
  pickNumber: number | null;
  /** Forced by the picks already made rather than chosen. */
  auto: boolean;
  /**
   * Who made this pick, when it wasn't the picker's own doing. Null on a
   * team's own pick and on anything the board assigned itself.
   */
  byProxyAlias: string | null;
  week: number;
  pickerId: string;
  pickerAlias: string;
  opponentId: string;
  opponentAlias: string;
}

export interface DraftStateView {
  id: string;
  label: string;
  weeks: number[];
  teams: DraftTeamView[];
  byWeek: { week: number; matchups: DraftMatchupView[] }[];
  history: DraftMatchupView[];
  made: number;
  total: number;
  complete: boolean;
  onTheClockId: string | null;
  onTheClockAlias: string | null;
  /** The caller's own manager id. */
  actingAsId: string | null;
  /** The caller may make the pick for whoever is on the clock. */
  canPickForOthers: boolean;
  /**
   * The team the caller is about to pick *for*, when that isn't the caller.
   * Null the rest of the time — including for the flag holder on their own
   * turn, so the room only warns when it's really somebody else's pick.
   */
  pickingFor: { managerId: string; alias: string } | null;
  canPick: boolean;
  /**
   * The options for the team on the clock, and only when the caller may take
   * them — their own turn, or a proxy picker stepping in.
   */
  legal: LegalPick[];
}

export interface LoadedDraft {
  draft: Database["public"]["Tables"]["rematch_drafts"]["Row"];
  picks: RematchPick[];
  order: string[];
  /**
   * Pick number → the manager who actually clicked, for the picks somebody
   * made on another team's behalf. Kept beside the picks rather than on
   * RematchPick so the rules engine stays free of the idea: the board folds
   * synthetic picks of its own, and "who clicked" means nothing for those.
   */
  proxyByPickNumber: Map<number, string>;
  aliasOf: (managerId: string) => string;
}

/** Either the season's one board, or why it couldn't be opened. */
export type EnsuredDraft = { id: string } | { error: string };

/**
 * The season's Rematch Draft, opened on demand.
 *
 * There is nothing to decide when creating a board — it's the season plus last
 * season's finishing order — so rather than a script or a commissioner button,
 * the first person to open the page brings it into existence and everyone
 * after that walks into the same room. `rematch_drafts_live_idx` (unique on
 * season_id) is what makes that safe: if two people first-load at the same
 * moment, the loser of the insert race re-reads the winner's board instead of
 * creating a second one.
 *
 * Writes go through the admin client — there's no insert policy on
 * rematch_drafts, per the RLS strategy in 0001_init.sql.
 */
export async function ensureSeasonDraft(
  admin: SupabaseClient<Database>,
  season: { id: string; year: number }
): Promise<EnsuredDraft> {
  const existing = await admin
    .from("rematch_drafts")
    .select("id")
    .eq("season_id", season.id)
    .maybeSingle();
  if (existing.data) return { id: existing.data.id };

  const finishOrder = finishOrderFor(season.year);
  if (!finishOrder) {
    return {
      error:
        `No ${season.year - 1} finishing order recorded yet — add it to ` +
        `FINISH_BY_YEAR in src/lib/rematch-draft.ts and reload.`,
    };
  }

  const { data: managers } = await admin
    .from("managers")
    .select("id, display_name");
  const idByName = new Map((managers ?? []).map((m) => [m.display_name, m.id]));

  const orderManagerIds: string[] = [];
  for (const displayName of finishOrder) {
    const id = idByName.get(displayName);
    // Nothing is written until every name resolves, so a typo leaves no
    // half-built board behind.
    if (!id) {
      return {
        error:
          `No manager with the Sleeper name "${displayName}" — the ` +
          `${season.year - 1} finishing order is out of sync with the league.`,
      };
    }
    orderManagerIds.push(id);
  }

  const { data: created, error } = await admin
    .from("rematch_drafts")
    .insert({
      season_id: season.id,
      label: `${season.year} Rematch Draft`,
      order_manager_ids: orderManagerIds,
    })
    .select("id")
    .single();

  if (error) {
    // 23505: somebody else opened the page a moment before us.
    if (error.code === "23505") {
      const { data: theirs } = await admin
        .from("rematch_drafts")
        .select("id")
        .eq("season_id", season.id)
        .maybeSingle();
      if (theirs) return { id: theirs.id };
    }
    return { error: error.message };
  }

  return { id: created.id };
}

/** One season's board, for the "other seasons" list in the room. */
export interface DraftIndexEntry {
  id: string;
  label: string;
  year: number;
}

/**
 * Every season's board, newest first. `/rematch-draft` always redirects to the
 * active season, so this is the only way back to an old one.
 */
export async function listSeasonDrafts(
  admin: SupabaseClient<Database>
): Promise<DraftIndexEntry[]> {
  const [{ data: drafts }, { data: seasons }] = await Promise.all([
    admin.from("rematch_drafts").select("id, label, season_id"),
    admin.from("seasons").select("id, year"),
  ]);

  const yearById = new Map((seasons ?? []).map((s) => [s.id, s.year]));

  return (drafts ?? [])
    .map((d) => ({
      id: d.id,
      label: d.label,
      year: yearById.get(d.season_id) ?? 0,
    }))
    .sort((a, b) => b.year - a.year);
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
      .select(
        "pick_number, week, picker_manager_id, opponent_manager_id, made_by_manager_id"
      )
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
    proxyByPickNumber: new Map(
      (rows ?? [])
        .filter((r) => r.made_by_manager_id !== null)
        .map((r) => [r.pick_number, r.made_by_manager_id!])
    ),
    aliasOf: (managerId: string) => nameById.get(managerId) ?? "—",
  };
}

/**
 * Derive everything the room renders. `actingAsId` is the caller's manager id,
 * or null when whoever is looking isn't a manager in this draft.
 *
 * `canPickForOthers` widens that: a caller holding the flag gets the options
 * belonging to whoever is on the clock, not their own. It's the one place in
 * the app where the board you're shown isn't yours, so it's opt-in per caller
 * and the room says whose turn it's filling in.
 */
export function toStateView(
  loaded: LoadedDraft,
  actingAsId: string | null,
  opts: { canPickForOthers?: boolean } = {}
): DraftStateView {
  const { draft, order, picks, proxyByPickNumber, aliasOf } = loaded;
  const board = buildBoard(order, picks);
  const clockId = onTheClock(order, picks);
  const canPickForOthers = opts.canPickForOthers === true;

  const matchup = (m: Matchup | RematchPick): DraftMatchupView => {
    const madeBy =
      m.pickNumber === null ? undefined : proxyByPickNumber.get(m.pickNumber);
    return {
      pickNumber: m.pickNumber,
      auto: "auto" in m ? m.auto : false,
      byProxyAlias: madeBy ? aliasOf(madeBy) : null,
      week: m.week,
      pickerId: m.pickerManagerId,
      pickerAlias: aliasOf(m.pickerManagerId),
      opponentId: m.opponentManagerId,
      opponentAlias: aliasOf(m.opponentManagerId),
    };
  };

  // Whoever is on the clock picks; a flag holder may take that turn for them.
  const canPick =
    !board.complete &&
    clockId !== null &&
    actingAsId !== null &&
    (actingAsId === clockId || canPickForOthers);
  const pickingFor =
    canPick && clockId !== null && clockId !== actingAsId
      ? { managerId: clockId, alias: aliasOf(clockId) }
      : null;

  return {
    id: draft.id,
    label: draft.label,
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
    canPickForOthers,
    pickingFor,
    canPick,
    // Always the options of the team on the clock — never the caller's, which
    // is the same thing except when somebody is picking on their behalf.
    legal:
      canPick && clockId
        ? legalPicks(
            order,
            picks,
            clockId,
            aliasOf,
            pickingFor ? pickingFor.alias : undefined
          )
        : [],
  };
}
