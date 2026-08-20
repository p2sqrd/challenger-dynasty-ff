import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { loadRankingCards } from "@/lib/rankings";
import { seasonSpanLabel } from "@/lib/season-label";
import type { RankingEntry, RankingKind } from "@/types/database";
import { PageHeader } from "@/components/PageHeader";
import { RankingReadView } from "@/components/RankingReadView";
import { RankingEditor } from "@/components/RankingEditor";
import { RankingsYearTabs } from "@/components/RankingsYearTabs";
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

  const { data: season } = await supabase
    .from("seasons")
    .select("id, year, starting_budget, keeper_deadline")
    .eq("status", "active")
    .single();

  if (!season) {
    return (
      <div>
        <PageHeader title="Rankings" />
        <p className="text-sm text-muted">No active season configured yet.</p>
      </div>
    );
  }

  const isAuthor = manager?.is_ranking_author === true;

  // Both boards for the season. RLS returns a row only when it's published, or
  // always to an author — so a row being present means this viewer may see it.
  const { data: rows } = await supabase
    .from("rankings")
    .select("kind, entries, published")
    .eq("season_id", season.id)
    .in("kind", ["post_keeper", "post_draft"]);
  const byKind = new Map(
    (rows ?? []).map((r) => [r.kind as RankingKind, r])
  );
  const keeper = byKind.get("post_keeper");
  const draft = byKind.get("post_draft");

  const keeperEntries = (keeper?.entries ?? []) as RankingEntry[];
  const draftEntries = (draft?.entries ?? []) as RankingEntry[];

  // Post-Keeper is now locked — read-only for everyone, authors included. Its
  // cards are needed whenever the viewer can see the board at all.
  const keeperCards = keeper
    ? await loadRankingCards(supabase, season, manager?.id ?? null, keeperEntries)
    : [];

  // Post-Draft is the editable board now — authors load cards to edit; everyone
  // else only needs them once it's published.
  const draftCards =
    isAuthor || draft
      ? await loadRankingCards(supabase, season, manager?.id ?? null, draftEntries)
      : [];

  const currentYear = (
    <div>
      <section className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="nameplate-type text-2xl leading-none text-ink">
            Post-Keeper Rankings
          </h2>
          {keeper?.published && (
            <span className="rounded-full border border-line px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted">
              Final
            </span>
          )}
        </div>

        {keeper ? <RankingReadView cards={keeperCards} /> : <NotOutYet />}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="nameplate-type text-2xl leading-none text-ink">
            Post-Draft Rankings
          </h2>
          {isAuthor && (
            <span className="rounded-full border border-line px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted">
              {draft?.published ? "Published" : "Draft"} · you can edit
            </span>
          )}
        </div>

        {isAuthor ? (
          <RankingEditor
            cards={draftCards}
            initialEntries={draftEntries}
            published={draft?.published ?? false}
            kind="post_draft"
          />
        ) : draft ? (
          <RankingReadView cards={draftCards} />
        ) : (
          <NotOutYet />
        )}
      </section>
    </div>
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
            label: seasonSpanLabel(season.year),
            panel: currentYear,
          },
          { key: "2025", label: "2025", panel: <Rankings2025 /> },
        ]}
      />
    </div>
  );
}
