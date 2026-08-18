import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureSeasonDraft } from "@/lib/rematch-load";
import { PageHeader } from "@/components/PageHeader";

/**
 * There's exactly one Rematch Draft per season and nothing to choose when
 * making it, so this isn't a list — it opens the season's board (creating it
 * on the first visit of the year) and sends you straight into the room.
 */
export default async function RematchDraftIndexPage() {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("id, year")
    .eq("status", "active")
    .maybeSingle();

  const result = season
    ? await ensureSeasonDraft(createAdminClient(), season)
    : { error: "No active season configured yet." };

  if ("id" in result) redirect(`/rematch-draft/${result.id}`);

  return (
    <div>
      <PageHeader title="Rematch Draft" />
      <p className="rounded-md border border-line bg-surface p-5 text-sm text-muted">
        {result.error}
      </p>
    </div>
  );
}
