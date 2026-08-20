import { createClient } from "@/lib/supabase/server";
import { seasonSpanLabel } from "@/lib/season-label";
import { PageHeader } from "@/components/PageHeader";
import { SeasonTabs } from "@/components/SeasonTabs";
import { BudgetSeasonTable } from "@/components/BudgetSeasonTable";

export default async function BudgetPage() {
  const supabase = await createClient();

  // Every season that has any budget activity, newest first — one tab each. The
  // active season leads (it's the newest), so new trades land on its tab.
  const [{ data: seasons }, { data: ledgerSeasons }] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, year, starting_budget, keeper_deadline, status")
      .order("year", { ascending: false }),
    supabase.from("budget_ledger").select("season_id"),
  ]);

  const seasonIdsWithLedger = new Set(
    (ledgerSeasons ?? []).map((l) => l.season_id)
  );
  const shown = (seasons ?? []).filter((s) => seasonIdsWithLedger.has(s.id));

  if (shown.length === 0) {
    return (
      <>
        <PageHeader title="Auction Budget" />
        <p className="text-sm text-muted">No budgets recorded yet.</p>
      </>
    );
  }

  return (
    <div>
      <PageHeader
        title="Auction Budget"
        subtitle="Every manager's auction budget — the $200 base plus every cash trade that's moved it since. Pick a season, then tap a row for the full ledger."
      />

      <SeasonTabs
        tabs={shown.map((s) => ({
          key: s.id,
          label: seasonSpanLabel(s.year),
          panel: (
            <BudgetSeasonTable
              season={{
                id: s.id,
                year: s.year,
                starting_budget: s.starting_budget,
                keeper_deadline: s.keeper_deadline,
              }}
            />
          ),
        }))}
      />
    </div>
  );
}
