import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPlayerNames } from "@/lib/players";
import { resolveTeam } from "@/lib/teams";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { BudgetChip, type ChipSide } from "@/components/BudgetChip";

interface Chip {
  amount: number;
  /** Player/team detail for real app-processed trades; null for seeded ones. */
  sides: ChipSide[] | null;
}

interface Row {
  managerId: string;
  name: string;
  base: number;
  trades: Chip[];
  keeperSpend: number;
  current: number;
  hasEntries: boolean;
}

export default async function BudgetPage() {
  const supabase = await createClient();

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, year, starting_budget, keeper_deadline")
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

  // Keepers are still editable until the deadline, so their cost stays off the
  // public table until then — each manager sees their own live keeper number
  // on the Keepers page. Once the deadline locks keepers in, it's reflected
  // here as everyone's final auction budget. (Before then, trades are
  // zero-sum, so the league total holds at the full starting pool.)
  // Server component: "now" per request is intended.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const keepersLocked =
    activeSeason.keeper_deadline != null &&
    new Date(activeSeason.keeper_deadline).getTime() <= now;

  const [{ data: managers }, { data: ledger }, { data: keepers }] =
    await Promise.all([
      supabase.from("managers").select("id, display_name"),
      supabase
        .from("budget_ledger")
        .select("manager_id, amount, reason, source_id, created_at")
        .eq("season_id", activeSeason.id)
        .order("created_at", { ascending: true }),
      // Keeper spend comes straight from each manager's keeper picks — there's
      // no approval step or keeper ledger entry anymore. It only folds into the
      // public budget once the deadline locks selections in.
      supabase
        .from("keepers")
        .select("manager_id, new_price")
        .eq("season_id", activeSeason.id),
    ]);
  const nameById = new Map((managers ?? []).map((m) => [m.id, m.display_name]));

  const keeperSpendByManager = new Map<string, number>();
  for (const k of keepers ?? []) {
    keeperSpendByManager.set(
      k.manager_id,
      (keeperSpendByManager.get(k.manager_id) ?? 0) + k.new_price
    );
  }

  // For trade chips backed by a real trade (source_id → a trades row), pull the
  // sides so the hover can show who got which players. Seeded spreadsheet
  // figures have no source_id and stay detail-less.
  const sourceIds = [
    ...new Set(
      (ledger ?? [])
        .filter((e) => e.reason === "trade" && e.source_id)
        .map((e) => e.source_id as string)
    ),
  ];
  const sidesByTradeId = new Map<string, ChipSide[]>();
  if (sourceIds.length > 0) {
    const { data: tradeSides } = await supabase
      .from("trade_sides")
      .select("trade_id, manager_id, players_received, cash_amount")
      .in("trade_id", sourceIds);
    const playerNames = await getPlayerNames(
      supabase,
      (tradeSides ?? []).flatMap((s) => s.players_received)
    );
    for (const s of tradeSides ?? []) {
      const list = sidesByTradeId.get(s.trade_id) ?? [];
      list.push({
        name: resolveTeam(nameById.get(s.manager_id)).name,
        players: s.players_received.map((p) => playerNames.get(p) ?? p),
        cash: s.cash_amount,
      });
      sidesByTradeId.set(s.trade_id, list);
    }
  }

  // Only managers with a ledger entry this season are in the league — this
  // naturally drops anyone who has left (they carry no 2026 budget).
  const rows: Row[] = (managers ?? [])
    .map((m) => {
      const entries = (ledger ?? []).filter((e) => e.manager_id === m.id);
      const base = entries
        .filter((e) => e.reason === "starting_budget")
        .reduce((s, e) => s + e.amount, 0);
      const trades: Chip[] = entries
        .filter((e) => e.reason === "trade")
        .map((e) => ({
          amount: e.amount,
          sides: e.source_id ? sidesByTradeId.get(e.source_id) ?? null : null,
        }));
      // What this manager has committed to keepers (positive dollars). Only
      // folds into the public budget once keepers are locked.
      const keeperSpend = keeperSpendByManager.get(m.id) ?? 0;
      // Running budget from the ledger (base + trades). Keepers are tracked
      // separately in the keepers table, never the ledger.
      const nonKeeper = entries
        .filter((e) => e.reason !== "keeper")
        .reduce((s, e) => s + e.amount, 0);
      return {
        managerId: m.id,
        name: m.display_name,
        base,
        trades,
        keeperSpend,
        current: keepersLocked ? nonKeeper - keeperSpend : nonKeeper,
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
              const net = r.trades.reduce((s, c) => s + c.amount, 0);
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
                    {r.trades.length === 0 &&
                    !(keepersLocked && r.keeperSpend !== 0) ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span className="flex flex-wrap items-center gap-1">
                        {r.trades.map((c, i) => (
                          <BudgetChip key={i} amount={c.amount} sides={c.sides} />
                        ))}
                        {r.trades.length > 0 && (
                          <span className="tabular ml-1 text-xs text-muted">
                            net {net >= 0 ? "+" : "−"}${Math.abs(net)}
                          </span>
                        )}
                        {keepersLocked && r.keeperSpend !== 0 && (
                          <span className="tabular rounded bg-gold/10 px-1.5 py-0.5 text-xs text-gold">
                            keepers −${Math.abs(r.keeperSpend)}
                          </span>
                        )}
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
        {keepersLocked ? (
          <>
            Keepers are locked in, so this is each manager&apos;s remaining
            auction budget (base + trades − keepers). Green chips are money
            received; red chips are money sent.
          </>
        ) : (
          <>
            Trades are zero-sum, so the league total holds at ${leagueTotal}.
            Keeper costs land here once the keeper deadline locks keepers in —
            until then, each manager tracks their own live keeper budget on the
            Keepers page.
          </>
        )}
      </p>
    </div>
  );
}
