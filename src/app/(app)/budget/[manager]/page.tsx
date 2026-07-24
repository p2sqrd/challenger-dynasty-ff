import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveTeam } from "@/lib/teams";
import { Nameplate } from "@/components/Nameplate";

const REASON_LABELS: Record<string, string> = {
  trade: "Trade",
  starting_budget: "Starting budget",
  other: "Other",
};

interface LedgerRow {
  id: string;
  createdAt: string;
  label: string;
  amount: number;
}

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
    .select("id, keeper_deadline")
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

  // Keepers live in their own table now (no approval, no ledger entry). Once
  // locked, fold each kept player in as a deduction line.
  const { data: keepers } =
    keepersLocked && activeSeason
      ? await supabase
          .from("keepers")
          .select("id, player_name, new_price, created_at")
          .eq("manager_id", managerId)
          .eq("season_id", activeSeason.id)
      : { data: [] };

  const rows: LedgerRow[] = [
    // Any legacy keeper ledger rows are ignored — keepers come from the table.
    ...(allEntries ?? [])
      .filter((e) => e.reason !== "keeper")
      .map((e) => ({
        id: e.id,
        createdAt: e.created_at,
        label: REASON_LABELS[e.reason] ?? e.reason,
        amount: e.amount,
      })),
    ...(keepers ?? []).map((k) => ({
      id: `keeper-${k.id}`,
      createdAt: k.created_at,
      label: `Keeper · ${k.player_name}`,
      amount: -k.new_price,
    })),
  ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const balance = rows.reduce((sum, r) => sum + r.amount, 0);

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
            {rows.map((row) => {
              const positive = row.amount >= 0;
              return (
                <tr
                  key={row.id}
                  className="border-b border-line last:border-0"
                >
                  <td className="tabular py-3 pl-4 pr-4 text-muted">
                    {new Date(row.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4 text-ink">{row.label}</td>
                  <td
                    className={`tabular py-3 pr-4 text-right ${
                      positive ? "text-ink" : "text-muted"
                    }`}
                  >
                    <span className="mr-1 text-xs">{positive ? "▲" : "▼"}</span>
                    {positive ? "+" : "−"}
                    {Math.abs(row.amount)}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-sm text-muted">
                  No ledger entries yet — cash moves show up here after a trade
                  is approved.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
