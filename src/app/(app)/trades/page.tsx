import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { detectTradeback, type PlayerTradeEvent } from "@/lib/rules/tradeback";
import { loadTradesContext } from "@/lib/trades/load";
import { PageHeader } from "@/components/PageHeader";
import { ManualTradeForm } from "@/components/ManualTradeForm";
import { SyncTradesButton } from "@/components/SyncTradesButton";
import { ActiveTradeCard, type TradeAction } from "@/components/ActiveTradeCard";

interface TradeSideRowNoCash {
  trade_id: string;
  manager_id: string;
  players_received: string[];
}

export default async function ProcessTradesPage() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "active")
    .single();

  if (!activeSeason) {
    return <p className="text-sm text-neutral-500">No active season.</p>;
  }

  const {
    managers,
    trades: allTrades,
    sidesByTradeId,
    nameById,
    playerName,
    viewSides,
  } = await loadTradesContext(supabase, activeSeason.id);

  // Everything not yet finalized lives in one list. History (approved /
  // rejected) has its own page.
  const active = allTrades.filter(
    (t) => t.status === "pending_cash" || t.status === "pending_approval"
  );
  const pendingApproval = active.filter((t) => t.status === "pending_approval");

  // What can *this* viewer do with a given trade? The manager who owes cash
  // enters it; the commissioner approves; everyone else just watches.
  function actionFor(t: (typeof active)[number]): TradeAction {
    if (
      t.status === "pending_cash" &&
      manager &&
      (sidesByTradeId.get(t.id) ?? []).some((s) => s.manager_id === manager.id)
    ) {
      return "enter_cash";
    }
    if (t.status === "pending_approval" && manager?.role === "commissioner") {
      return "approve";
    }
    return "none";
  }

  // Trades that need something from you float to the top; the rest keep their
  // newest-first order (loadTradesContext already sorts by created_at desc).
  const cards = active
    .map((t) => ({ trade: t, action: actionFor(t) }))
    .sort((a, b) => {
      const rank = (x: TradeAction) => (x === "none" ? 1 : 0);
      return rank(a.action) - rank(b.action);
    });

  // Tradeback warnings only cover straightforward two-team trades — with
  // three or more teams involved, Sleeper's data doesn't tell us which side
  // a given player came from, so we can't reliably build the "from -> to"
  // chain detectTradeback needs. This only ever surfaces as a warning to
  // the commissioner, never a block, so under-warning here is an
  // acceptable tradeoff for not over-warning on bad data.
  let tradebackWarnings = new Map<string, string[]>();
  if (manager?.role === "commissioner" && pendingApproval.length > 0) {
    const { data: approvedTrades } = await supabase
      .from("trades")
      .select("id, approved_at, created_at")
      .eq("status", "approved");
    const approvedIds = (approvedTrades ?? []).map((t) => t.id);
    const { data: approvedSides } =
      approvedIds.length > 0
        ? await supabase
            .from("trade_sides")
            .select("trade_id, manager_id, players_received")
            .in("trade_id", approvedIds)
        : { data: [] as TradeSideRowNoCash[] };

    const sidesByApprovedTrade = new Map<string, TradeSideRowNoCash[]>();
    for (const s of approvedSides ?? []) {
      const list = sidesByApprovedTrade.get(s.trade_id) ?? [];
      list.push(s);
      sidesByApprovedTrade.set(s.trade_id, list);
    }

    const playerHistory: PlayerTradeEvent[] = [];
    for (const t of approvedTrades ?? []) {
      const tSides = sidesByApprovedTrade.get(t.id) ?? [];
      if (tSides.length !== 2) continue;
      const [a, b] = tSides;
      const occurredAt = new Date(t.approved_at ?? t.created_at).getTime();
      for (const playerId of a.players_received) {
        playerHistory.push({
          tradeId: t.id,
          playerId,
          fromManagerId: b.manager_id,
          toManagerId: a.manager_id,
          occurredAt,
        });
      }
      for (const playerId of b.players_received) {
        playerHistory.push({
          tradeId: t.id,
          playerId,
          fromManagerId: a.manager_id,
          toManagerId: b.manager_id,
          occurredAt,
        });
      }
    }

    tradebackWarnings = new Map(
      pendingApproval.map((t) => {
        const tSides = sidesByTradeId.get(t.id) ?? [];
        const warnings: string[] = [];
        if (tSides.length === 2) {
          const [a, b] = tSides;
          for (const playerId of a.players_received) {
            const check = detectTradeback({
              playerId,
              proposedFromManagerId: b.manager_id,
              proposedToManagerId: a.manager_id,
              tradeHistory: playerHistory,
            });
            if (check.warning) {
              warnings.push(
                `${playerName(playerId)} would return to ${nameById.get(
                  a.manager_id
                )}, who traded them away previously without a third team in between.`
              );
            }
          }
          for (const playerId of b.players_received) {
            const check = detectTradeback({
              playerId,
              proposedFromManagerId: a.manager_id,
              proposedToManagerId: b.manager_id,
              tradeHistory: playerHistory,
            });
            if (check.warning) {
              warnings.push(
                `${playerName(playerId)} would return to ${nameById.get(
                  b.manager_id
                )}, who traded them away previously without a third team in between.`
              );
            }
          }
        }
        return [t.id, warnings];
      })
    );
  }

  return (
    <div>
      <PageHeader
        title="Process Trade"
        subtitle="Trades don't sync automatically. After you make one on Sleeper, hit Sync from Sleeper to pull it in — then enter any cash that was part of the deal."
        right={manager ? <SyncTradesButton /> : undefined}
      />

      {manager?.role === "commissioner" && (
        <div className="mb-6">
          <ManualTradeForm seasonId={activeSeason.id} managers={managers} />
        </div>
      )}

      {cards.length === 0 ? (
        <p className="text-sm text-muted">
          No trades in flight. Make one on Sleeper, then hit Sync from Sleeper to
          pull it in.
        </p>
      ) : (
        <div className="space-y-4">
          {cards.map(({ trade, action }) => (
            <ActiveTradeCard
              key={trade.id}
              tradeId={trade.id}
              status={trade.status as "pending_cash" | "pending_approval"}
              createdAt={trade.created_at}
              sides={viewSides(trade.id)}
              action={action}
              myManagerId={manager?.id}
              warnings={tradebackWarnings.get(trade.id) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
