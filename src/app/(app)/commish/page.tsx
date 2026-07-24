import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { PageHeader } from "@/components/PageHeader";
import { DeadlineSettingsForm } from "@/components/DeadlineSettingsForm";

export default async function CommishPage() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  if (manager?.role !== "commissioner") {
    return (
      <>
        <PageHeader title="Commish" />
        <p className="text-sm text-muted">Commissioner access only.</p>
      </>
    );
  }

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "active")
    .single();

  if (!activeSeason) {
    return (
      <>
        <PageHeader title="Commish" />
        <p className="text-sm text-muted">No active season.</p>
      </>
    );
  }

  return (
    <div>
      <PageHeader
        title="Commish"
        subtitle={`Run the ${activeSeason.year} season.`}
      />

      <section>
        <h2 className="nameplate-type text-lg text-ink">Deadlines</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Set the keeper deadline and draft time. Saving updates the countdowns
          for everyone, and keepers lock automatically when the deadline passes.
        </p>
        <DeadlineSettingsForm
          keeperDeadline={activeSeason.keeper_deadline ?? null}
          draftDatetime={activeSeason.draft_datetime ?? null}
        />
      </section>

      <section className="mt-12">
        <h2 className="nameplate-type text-lg text-ink">Keepers</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Keepers are self-service — each manager submits and edits their own up
          to the deadline, and the system enforces the budget, so there&apos;s
          nothing to approve. Everyone&apos;s kept players stay private until the
          deadline locks them in, then appear for the whole league (including you)
          on the Keepers page.
        </p>
      </section>
    </div>
  );
}
