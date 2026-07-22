import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";

interface Row {
  managerId: string;
  name: string;
  base: number;
  trades: number[];
  current: number;
  hasEntries: boolean;
}

export default async function BudgetPage() {
  const supabase = await createClient();

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, year, starting_budget")
    .eq("status", "active")
    .single();

  if (!activeSeason) {
    return (
      <>
        <PageHeader title="Auction Budget" />
        <p className="text-sm text-muted">No active season configured yet.</p>
      </>
    );
  }

  const [{ data: managers }, { data: ledger }] = await Promise.all([
    supabase.from("managers").select("id, display_name"),
    supabase
      .from("budget_ledger")
      .select("manager_id, amount, reason, created_at")
      .eq("season_id", activeSeason.id)
      .order("created_at", { ascending: true }),
  ]);

  // Only managers with a ledger entry this season are in the league — this
  // naturally drops anyone who has left (they carry no 2026 budget).
  const rows: Row[] = (managers ?? [])
    .map((m) => {
      const entries = (ledger ?? []).filter((e) => e.manager_id === m.id);
      const base = entries
        .filter((e) => e.reason === "starting_budget")
        .reduce((s, e) => s + e.amount, 0);
      const trades = entries
        .filter((e) => e.reason === "trade")
        .map((e) => e.amount);
      const current = entries.reduce((s, e) => s + e.amount, 0);
      return {
        managerId: m.id,
        name: m.display_name,
        base,
        trades,
        current,
        hasEntries: entries.length > 0,
      };
    })
    .filter((r) => r.hasEntries);

  rows.sort((a, b) => b.current - a.current);
  const leagueTotal = rows.reduce((s, r) => s + r.current, 0);

  return (
    <div>
      <PageHeader
        title="Auction Budget"
        subtitle={`Every manager's ${activeSeason.year} auction budget — the $${activeSeason.starting_budget} base plus every cash trade that's moved it since. Tap a row for the full ledger.`}
      />

      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <th className="py-3 pl-4 pr-4 text-left font-medium">Manager</th>
              <th className="py-3 pr-4 text-right font-medium">Base</th>
              <th className="py-3 pr-4 text-left font-medium">Trades</th>
              <th className="py-3 pr-4 text-right font-medium">Current</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const net = r.trades.reduce((s, a) => s + a, 0);
              return (
                <tr
                  key={r.managerId}
                  className="group border-b border-line transition-colors last:border-0 hover:bg-surface-2"
                >
                  <td className="py-3 pl-4 pr-4">
                    <Link
                      href={`/budget/${r.managerId}`}
                      className="inline-flex"
                    >
                      <Nameplate alias={r.name} size="sm" />
                    </Link>
                  </td>
                  <td className="tabular py-3 pr-4 text-right text-muted">
                    ${r.base}
                  </td>
                  <td className="py-3 pr-4">
                    {r.trades.length === 0 ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span className="flex flex-wrap items-center gap-1">
                        {r.trades.map((a, i) => (
                          <span
                            key={i}
                            className={`tabular rounded px-1.5 py-0.5 text-xs ${
                              a >= 0
                                ? "bg-approved/10 text-approved"
                                : "bg-rejected/10 text-rejected"
                            }`}
                          >
                            {a >= 0 ? "+" : "−"}${Math.abs(a)}
                          </span>
                        ))}
                        <span className="tabular ml-1 text-xs text-muted">
                          net {net >= 0 ? "+" : "−"}${Math.abs(net)}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="tabular py-3 pr-4 text-right text-base font-semibold text-ink">
                    ${r.current}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-line">
              <td className="py-3 pl-4 pr-4 text-xs uppercase tracking-wide text-muted">
                League total
              </td>
              <td />
              <td />
              <td className="tabular py-3 pr-4 text-right font-semibold text-ink">
                ${leagueTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted">
        Trades are zero-sum, so the league total always holds at $
        {leagueTotal}. Green chips are money received; red chips are money sent.
      </p>
    </div>
  );
}
