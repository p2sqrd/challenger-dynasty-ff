import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { detectTradeback, type PlayerTradeEvent } from "@/lib/rules/tradeback";
import { loadTradesContext } from "@/lib/trades/load";
import { PageHeader } from "@/components/PageHeader";
import { TradeSidesView } from "@/components/TradeSides";
import { TradeCashForm } from "@/components/TradeCashForm";
import { TradeApprovalQueue } from "@/components/TradeApprovalQueue";
import { ManualTradeForm } from "@/components/ManualTradeForm";
import { SyncTradesButton } from "@/components/SyncTradesButton";

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

  // A pending_cash trade needs the cash entered by *either* party — the first
  // one to submit finalizes it and sends it to the commissioner — so show the
  // form to anyone who's a party to it.
  const needsMyCash = manager
    ? allTrades.filter((t) => {
        if (t.status !== "pending_cash") return false;
        return (sidesByTradeId.get(t.id) ?? []).some(
          (s) => s.manager_id === manager.id
        );
      })
    : [];

  const pendingApproval = allTrades.filter(
    (t) => t.status === "pending_approval"
  );

  // Everyone can see mid-flight trades (awaiting cash or approval) so a synced
  // trade is visible league-wide right away — not just to the two managers in
  // it. We drop the ones already surfaced to this viewer as an action above
  // (their own cash-entry forms, and the commissioner's approval queue) to
  // avoid showing the same trade twice.
  const needsMyCashIds = new Set(needsMyCash.map((t) => t.id));
  const inProgress = allTrades.filter(
    (t) =>
      (t.status === "pending_cash" || t.status === "pending_approval") &&
      !needsMyCashIds.has(t.id) &&
      !(manager?.role === "commissioner" && t.status === "pending_approval")
  );

  // Tradeback warnings only cover straightforward two-team trades — with
  // three or more teams involved, Sleeper's data doesn't tell us which side
  // a given player came from, so we can't reliably build the "from -> to"
  // chain detectTradeback needs. This only ever surfaces as a warning to
  // the commissioner, never a block, so under-warning here is an
  // acceptable tradeoff for not over-warning on bad data.
  let tradebackWarnings = new Map<string, string[]>();
  if (pendingApproval.length > 0) {
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
        title={`Process Trades · ${activeSeason.year}`}
        subtitle="New trades sync from Sleeper automatically every few hours. Just made one? Hit Sync from Sleeper to pull it in now."
        right={manager ? <SyncTradesButton /> : undefined}
      />

      {manager && (
        <section>
          <h2 className="nameplate-type text-lg text-ink">
            Needs your cash entry
          </h2>
          {needsMyCash.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nothing pending.</p>
          ) : (
            <div className="mt-3 space-y-4">
              {needsMyCash.map((t) => (
                <TradeCashForm
                  key={t.id}
                  tradeId={t.id}
                  myManagerId={manager.id}
                  sides={viewSides(t.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {manager?.role === "commissioner" && (
        <section className="mt-12">
          <h2 className="nameplate-type text-lg text-ink">Pending approval</h2>
          <div className="mt-3">
            <ManualTradeForm
              seasonId={activeSeason.id}
              managers={managers}
            />
          </div>
          <TradeApprovalQueue
            trades={pendingApproval.map((t) => ({
              id: t.id,
              sides: viewSides(t.id),
              warnings: tradebackWarnings.get(t.id) ?? [],
            }))}
          />
        </section>
      )}

      <section className="mt-12">
        <h2 className="nameplate-type text-lg text-ink">In progress</h2>
        {inProgress.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No trades in progress.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {inProgress.map((t) => (
              <div
                key={t.id}
                className="rounded-md border border-line bg-surface p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full border border-line px-2 py-0.5 text-xs text-pending">
                    {t.status === "pending_cash"
                      ? "Awaiting cash"
                      : "Awaiting commissioner approval"}
                  </span>
                  <span className="tabular text-xs text-muted">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                </div>
                <TradeSidesView sides={viewSides(t.id)} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
