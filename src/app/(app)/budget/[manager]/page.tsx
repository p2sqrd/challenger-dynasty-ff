import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveTeam } from "@/lib/teams";
import { Nameplate } from "@/components/Nameplate";

const REASON_LABELS: Record<string, string> = {
  trade: "Trade",
  keeper: "Keeper",
  starting_budget: "Starting budget",
  other: "Other",
};

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ manager: string }>;
}) {
  const { manager: managerId } = await params;
  const supabase = await createClient();

  const { data: manager } = await supabase
    .from("managers")
    .select("id, display_name")
    .eq("id", managerId)
    .single();

  if (!manager) notFound();

  const team = resolveTeam(manager.display_name);

  // Keeper costs stay off the public ledger until the deadline locks them in,
  // matching the Budget table. Each manager tracks their own live keeper
  // number on the Keepers page until then.
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("keeper_deadline")
    .eq("status", "active")
    .single();
  // Server component: "now" per request is intended.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const keepersLocked =
    activeSeason?.keeper_deadline != null &&
    new Date(activeSeason.keeper_deadline).getTime() <= now;

  const { data: allEntries } = await supabase
    .from("budget_ledger")
    .select("id, amount, reason, created_at")
    .eq("manager_id", managerId)
    .order("created_at", { ascending: false });

  const entries = keepersLocked
    ? allEntries ?? []
    : (allEntries ?? []).filter((e) => e.reason !== "keeper");

  const balance = entries.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      {/* Nameplate + balance masthead: the ledger's headline number reads
          like a cap-space ticker. */}
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-md border border-line bg-surface p-5">
        <div>
          <Nameplate team={team} size="lg" />
          <p className="mt-2 text-sm text-muted">Budget ledger</p>
        </div>
        <div className="text-right">
          <div className="tabular text-4xl font-semibold text-ink">
            ${balance}
          </div>
          <div className="text-xs uppercase tracking-wide text-muted">
            Current balance
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted">
        Every transaction that produced the current balance — no more opaque
        running numbers.
      </p>

      <div className="mt-6 overflow-hidden rounded-md border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <th className="py-3 pl-4 pr-4 text-left font-medium">Date</th>
              <th className="py-3 pr-4 text-left font-medium">Reason</th>
              <th className="py-3 pr-4 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(entries ?? []).map((entry) => {
              const positive = entry.amount >= 0;
              return (
                <tr
                  key={entry.id}
                  className="border-b border-line last:border-0"
                >
                  <td className="tabular py-3 pl-4 pr-4 text-muted">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4 text-ink">
                    {REASON_LABELS[entry.reason] ?? entry.reason}
                  </td>
                  <td
                    className={`tabular py-3 pr-4 text-right ${
                      positive ? "text-ink" : "text-muted"
                    }`}
                  >
                    <span className="mr-1 text-xs">{positive ? "▲" : "▼"}</span>
                    {positive ? "+" : "−"}
                    {Math.abs(entry.amount)}
                  </td>
                </tr>
              );
            })}
            {(entries ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-sm text-muted">
                  No ledger entries yet — cash moves show up here after a trade
                  or keeper is approved.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
