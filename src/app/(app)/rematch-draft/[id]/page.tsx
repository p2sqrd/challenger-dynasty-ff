import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import { loadDraft, toStateView } from "@/lib/rematch-load";
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

  return (
    <RematchDraftRoom initial={initial} myManagerId={manager?.id ?? null} />
  );
}
