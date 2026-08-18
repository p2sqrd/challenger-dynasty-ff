import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import { listSeasonDrafts, loadDraft, toStateView } from "@/lib/rematch-load";
import { PageHeader } from "@/components/PageHeader";
import { RematchDraftRoom } from "@/components/RematchDraftRoom";

export default async function RematchDraftRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  const admin = createAdminClient();
  const loaded = await loadDraft(admin, id);

  if (!loaded) {
    return (
      <div>
        <PageHeader title="Rematch Draft" />
        <p className="rounded-md border border-line bg-surface p-5 text-sm text-muted">
          That draft doesn&apos;t exist.{" "}
          <Link href="/rematch-draft" className="text-brand">
            Back to the draft list
          </Link>
          .
        </p>
      </div>
    );
  }

  // Server-render the board so the room isn't blank on first paint; the client
  // takes over polling from here.
  const initial = toStateView(loaded, manager?.id ?? null);

  // /rematch-draft always redirects to the active season, so this list is the
  // only route back to an earlier year's board.
  const all = await listSeasonDrafts(admin);
  const thisYear = all.find((d) => d.id === id)?.year ?? 0;
  const others = all.filter((d) => d.id !== id);

  return (
    <>
      <RematchDraftRoom initial={initial} myManagerId={manager?.id ?? null} />

      {others.length > 0 && (
        <section className="mt-6 rounded-md border border-line bg-surface p-4">
          <h2 className="mb-3 text-xs uppercase tracking-wide text-muted">
            {others.every((d) => d.year < thisYear) ? "Past drafts" : "Other seasons"}
          </h2>
          <ul className="flex flex-col gap-2">
            {others.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/rematch-draft/${d.id}`}
                  className="flex items-center justify-between gap-2 rounded-md bg-canvas px-3 py-2 hover:bg-surface-2"
                >
                  <span className="nameplate-type text-ink">{d.label}</span>
                  <span className="text-xs uppercase tracking-wide text-muted">
                    Open →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
