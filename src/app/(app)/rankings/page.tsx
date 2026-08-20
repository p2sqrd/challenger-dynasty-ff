import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { loadRankingCards } from "@/lib/rankings";
import type { RankingEntry } from "@/types/database";
import { PageHeader } from "@/components/PageHeader";
import { RankingReadView } from "@/components/RankingReadView";
import { RankingsYearTabs } from "@/components/RankingsYearTabs";
import { RankingBoardTabs } from "@/components/RankingBoardTabs";
import { DynastyPowerRankings } from "@/components/DynastyPowerRankings";
import { Rankings2025 } from "@/components/Rankings2025";

function NotOutYet() {
  return (
    <p className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
      These rankings aren&apos;t out yet. Check back once the authors publish
      them.
    </p>
  );
}

export default async function RankingsPage() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  const [{ data: season }, { data: priorSeason }] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, year, starting_budget, keeper_deadline")
      .eq("status", "active")
      .single(),
    supabase
      .from("seasons")
      .select("id")
      .eq("status", "closed")
      .order("year", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!season) {
    return (
      <div>
        <PageHeader title="Rankings" />
        <p className="text-sm text-muted">No active season configured yet.</p>
      </div>
    );
  }

  const keeperSeasonId = priorSeason?.id ?? season.id;

  // Post-Keeper board for the season. RLS returns a row only when it's
  // published, or always to an author.
  const { data: rows } = await supabase
    .from("rankings")
    .select("kind, entries, published")
    .eq("season_id", season.id)
    .eq("kind", "post_keeper");
  const keeper = (rows ?? [])[0] as
    | { kind: string; entries: unknown; published: boolean }
    | undefined;

  const keeperEntries = (keeper?.entries ?? []) as RankingEntry[];

  const keeperCards = keeper
    ? await loadRankingCards(supabase, season, manager?.id ?? null, keeperEntries, { keeperSeasonId })
    : [];

  const currentYear = (
    <RankingBoardTabs
      tabs={[
        {
          key: "dynasty",
          label: "Dynasty Power Rankings",
          panel: <DynastyPowerRankings />,
        },
        {
          key: "post-keeper",
          label: "Post-Keeper Rankings",
          panel: (
            <section>
              {keeper?.published && (
                <div className="mb-4">
                  <span className="rounded-full border border-line px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted">
                    Final
                  </span>
                </div>
              )}
              {keeper ? <RankingReadView cards={keeperCards} /> : <NotOutYet />}
            </section>
          ),
        },
      ]}
    />
  );

  return (
    <div>
      <PageHeader
        title="Rankings"
        subtitle="Where every team stands after keepers — and after the draft."
      />

      <RankingsYearTabs
        tabs={[
          {
            key: "current",
            label: String(season.year - 1),
            panel: currentYear,
          },
          { key: "2025", label: "2025", panel: <Rankings2025 /> },
        ]}
      />
    </div>
  );
}
