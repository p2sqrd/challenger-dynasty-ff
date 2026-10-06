import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { loadTradesContext } from "@/lib/trades/load";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { TradeSidesView } from "@/components/TradeSides";
import { ReopenTradeButton } from "@/components/ReopenTradeButton";

export default async function TradeHistoryPage() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  const isCommissioner = manager?.role === "commissioner";

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, year")
    .eq("status", "active")
    .single();

  if (!activeSeason) {
    return <p className="text-sm text-neutral-500">No active season.</p>;
  }

  const { trades: allTrades, viewSides } = await loadTradesContext(
    supabase,
    activeSeason.id
  );

  const history = allTrades.filter(
    (t) => t.status === "approved" || t.status === "rejected"
  );

  return (
    <div>
      <PageHeader
        title={`Trade History · ${activeSeason.year}`}
        subtitle="Every trade that's been approved or rejected this season."
      />

      {history.length === 0 ? (
        <p className="text-sm text-muted">
          No resolved trades yet this season.
        </p>
      ) : (
        <div className="space-y-4">
          {history.map((t) => (
            <div
              key={t.id}
              className="rounded-md border border-line bg-surface p-5"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <StatusBadge
                  status={t.status === "approved" ? "approved" : "rejected"}
                />
                <span className="flex items-center gap-3">
                  {isCommissioner && t.status === "approved" && (
                    <ReopenTradeButton tradeId={t.id} />
                  )}
                  <span className="tabular text-xs text-muted">
                    {new Date(t.approved_at ?? t.created_at).toLocaleDateString()}
                  </span>
                </span>
              </div>
              <TradeSidesView sides={viewSides(t.id)} />
              {t.status === "rejected" && t.rejection_reason && (
                <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
                  Reason: {t.rejection_reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
