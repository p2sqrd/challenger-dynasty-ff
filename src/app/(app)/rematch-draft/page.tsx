import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";

export default async function RematchDraftIndexPage() {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("id, year")
    .eq("status", "active")
    .maybeSingle();

  // The table may not exist yet (the migration is applied by hand after this
  // deploys), so a failed query is treated the same as "no draft yet".
  const { data: drafts } = season
    ? await supabase
        .from("rematch_drafts")
        .select("id, label, is_test, created_at")
        .eq("season_id", season.id)
        .order("is_test")
        .order("created_at", { ascending: false })
    : { data: null };

  const rows = drafts ?? [];
  const live = rows.filter((d) => !d.is_test);
  const tests = rows.filter((d) => d.is_test);

  return (
    <div>
      <PageHeader
        title="Rematch Draft"
        subtitle={
          season
            ? `Weeks 12, 13 and 14 of ${season.year} repeat opponents — drafted snake style, in reverse order of last season's playoff finish.`
            : undefined
        }
      />

      {rows.length === 0 ? (
        <p className="rounded-md border border-line bg-surface p-5 text-sm text-muted">
          No rematch draft yet.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <Section title="Draft" drafts={live} empty="The real draft hasn't been opened yet." />
          {tests.length > 0 && (
            <Section title="Test drafts" drafts={tests} empty="" />
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  drafts,
  empty,
}: {
  title: string;
  drafts: { id: string; label: string; is_test: boolean }[];
  empty: string;
}) {
  return (
    <section>
      <h2 className="mb-2 text-xs uppercase tracking-wide text-muted">{title}</h2>
      {drafts.length === 0 ? (
        <p className="rounded-md border border-line bg-surface p-5 text-sm text-muted">
          {empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {drafts.map((d) => (
            <li key={d.id}>
              <Link
                href={`/rematch-draft/${d.id}`}
                className="flex items-center justify-between rounded-md border border-line bg-surface p-4 text-sm text-ink hover:bg-surface-2"
              >
                <span className="nameplate-type text-lg">{d.label}</span>
                <span className="text-xs uppercase tracking-wide text-muted">
                  {d.is_test ? "Test board" : "Open the draft"} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
