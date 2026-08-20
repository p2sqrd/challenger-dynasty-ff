import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import { listSeasonDrafts, loadDraft, toStateView } from "@/lib/rematch-load";
import { seasonSpanLabel } from "@/lib/season-label";
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
  const initial = toStateView(loaded, manager?.id ?? null, {
    canPickForOthers: manager?.can_pick_for_others === true,
    canEdit: manager?.role === "commissioner",
  });

  // One tab per season's board, newest first (listSeasonDrafts sorts by year
  // desc). Each is its own route, so these are navigation tabs — the current
  // season is highlighted.
  const all = await listSeasonDrafts(admin);

  return (
    <>
      {all.length > 1 && (
        <div
          role="tablist"
          aria-label="Season"
          className="mb-6 flex gap-1 border-b border-line"
        >
          {all.map((d) => {
            const on = d.id === id;
            return (
              <Link
                key={d.id}
                href={`/rematch-draft/${d.id}`}
                role="tab"
                aria-selected={on}
                aria-current={on ? "page" : undefined}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                  on
                    ? "border-brand text-ink"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {seasonSpanLabel(d.year)}
              </Link>
            );
          })}
        </div>
      )}

      <RematchDraftRoom initial={initial} myManagerId={manager?.id ?? null} />
    </>
  );
}
