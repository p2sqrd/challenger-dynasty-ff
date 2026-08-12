import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { loadPostKeeperCards } from "@/lib/rankings";
import { PageHeader } from "@/components/PageHeader";
import { RankingReadView } from "@/components/RankingReadView";
import { RankingEditor } from "@/components/RankingEditor";

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

  // RLS returns a post_keeper row only when it's published, or always for an
  // author (their own draft). A missing row for a non-author therefore means
  // "not out yet".
  const { data: ranking } = await supabase
    .from("rankings")
    .select("entries, published")
    .eq("season_id", season.id)
    .eq("kind", "post_keeper")
    .maybeSingle();

  const entries = ranking?.entries ?? [];
  const published = ranking?.published ?? false;

  // Authors always load cards (to edit); everyone else only needs them when
  // there's a published ranking to render.
  const cards =
    isAuthor || published
      ? await loadPostKeeperCards(
          supabase,
          season,
          manager?.id ?? null,
          entries
        )
      : [];

  return (
    <div>
      <PageHeader
        title={`${season.year} Rankings`}
        subtitle="Where every team stands after keepers — and, soon, after the draft."
      />

      <section className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="nameplate-type text-2xl leading-none text-ink">
            Post-Keeper Rankings
          </h2>
          {isAuthor && (
            <span className="rounded-full border border-line px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted">
              {published ? "Published" : "Draft"} · you can edit
            </span>
          )}
        </div>

        {isAuthor ? (
          <RankingEditor
            cards={cards}
            initialEntries={entries}
            published={published}
          />
        ) : published ? (
          <RankingReadView cards={cards} />
        ) : (
          <p className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
            The Post-Keeper rankings aren&apos;t out yet. Check back once the
            authors publish them.
          </p>
        )}
      </section>

      <section>
        <h2 className="nameplate-type mb-4 text-2xl leading-none text-ink">
          Post-Draft Rankings
        </h2>
        <p className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          Coming Soon — once the auction dust settles.
        </p>
      </section>
    </div>
  );
}
