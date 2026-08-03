import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getPlayerNames } from "@/lib/players";

export interface TradeRow {
  id: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  approved_at: string | null;
}

export interface TradeSideRow {
  trade_id: string;
  manager_id: string;
  players_received: string[];
  cash_amount: number | null;
}

export interface ViewSide {
  managerId: string;
  managerName: string;
  playersReceived: string[];
  cashAmount: number | null;
}

/**
 * Shared loader for the Trades sub-pages (Process Trades + Trade History). Pulls
 * this season's trades, their sides, and the manager/player name lookups both
 * pages need, plus a `viewSides` helper that shapes a trade's sides for the
 * trade views. The Trade Simulator loads its own roster data separately.
 */
export async function loadTradesContext(
  supabase: SupabaseClient<Database>,
  seasonId: string
) {
  const { data: managers } = await supabase
    .from("managers")
    .select("id, display_name");
  const nameById = new Map((managers ?? []).map((m) => [m.id, m.display_name]));

  const { data: tradesData } = await supabase
    .from("trades")
    .select("id, status, rejection_reason, created_at, approved_at")
    .eq("season_id", seasonId)
    .order("created_at", { ascending: false });
  const trades = (tradesData ?? []) as TradeRow[];

  const tradeIds = trades.map((t) => t.id);
  const { data: sidesData } =
    tradeIds.length > 0
      ? await supabase
          .from("trade_sides")
          .select("trade_id, manager_id, players_received, cash_amount")
          .in("trade_id", tradeIds)
      : { data: [] as TradeSideRow[] };
  const sides = (sidesData ?? []) as TradeSideRow[];

  const sidesByTradeId = new Map<string, TradeSideRow[]>();
  for (const side of sides) {
    const list = sidesByTradeId.get(side.trade_id) ?? [];
    list.push(side);
    sidesByTradeId.set(side.trade_id, list);
  }

  const nameMap = await getPlayerNames(
    supabase,
    sides.flatMap((s) => s.players_received)
  );
  const playerName = (playerId: string) => nameMap.get(playerId) ?? playerId;

  const viewSides = (tradeId: string): ViewSide[] =>
    (sidesByTradeId.get(tradeId) ?? []).map((s) => ({
      managerId: s.manager_id,
      managerName: nameById.get(s.manager_id) ?? s.manager_id,
      playersReceived: s.players_received.map(playerName),
      cashAmount: s.cash_amount,
    }));

  return {
    managers: managers ?? [],
    trades,
    sidesByTradeId,
    nameById,
    playerName,
    viewSides,
  };
}
