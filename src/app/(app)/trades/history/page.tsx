import { createClient } from "@/lib/supabase/server";
import { loadTradesContext } from "@/lib/trades/load";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { TradeSidesView } from "@/components/TradeSides";

export default async function TradeHistoryPage() {
  const supabase = await createClient();

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
              <div className="mb-4 flex items-center justify-between">
                <StatusBadge
                  status={t.status === "approved" ? "approved" : "rejected"}
                />
                <span className="tabular text-xs text-muted">
                  {new Date(t.approved_at ?? t.created_at).toLocaleDateString()}
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
