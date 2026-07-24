import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
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

  const [{ data: managers }, { data: ledger }] = await Promise.all([
    supabase.from("managers").select("id, display_name"),
    supabase
      .from("budget_ledger")
      .select("manager_id")
      .eq("season_id", activeSeason.id),
  ]);

  // Who has submitted keepers — the *fact* of submission only. We read this
  // with the admin client (bypassing the keepers RLS), and deliberately select
  // just manager_id, never player names or prices, so commissioners can nudge
  // stragglers without anyone's actual picks being exposed here.
  const admin = createAdminClient();
  const { data: keeperRows } = await admin
    .from("keepers")
    .select("manager_id")
    .eq("season_id", activeSeason.id);
  const submittedIds = new Set((keeperRows ?? []).map((k) => k.manager_id));

  // Current league members = those with a budget entry this season (drops
  // anyone who has left), matching the Budget and All-Keepers views.
  const activeIds = new Set((ledger ?? []).map((l) => l.manager_id));
  const roster = (managers ?? [])
    .filter((m) => activeIds.has(m.id))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
  const submitted = roster.filter((m) => submittedIds.has(m.id));
  const notSubmitted = roster.filter((m) => !submittedIds.has(m.id));

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
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="nameplate-type text-lg text-ink">Keeper submissions</h2>
          <span className="tabular text-sm text-muted">
            {submitted.length} of {roster.length} submitted
          </span>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Keepers are self-service — the system enforces the budget, so
          there&apos;s nothing to approve. You can see who&apos;s submitted so you
          can remind the stragglers, but{" "}
          <span className="text-ink">not what anyone kept</span> — picks stay
          private for everyone (you included) until the deadline locks them in.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-line bg-surface p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
              <span className="inline-block h-2 w-2 rounded-full bg-approved" />
              Submitted ({submitted.length})
            </div>
            {submitted.length === 0 ? (
              <p className="text-sm text-muted">No one has submitted yet.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {submitted.map((m) => (
                  <li key={m.id}>
                    <Nameplate alias={m.display_name} size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-md border border-line bg-surface p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
              <span className="inline-block h-2 w-2 rounded-full bg-pending" />
              Not yet ({notSubmitted.length})
            </div>
            {notSubmitted.length === 0 ? (
              <p className="text-sm text-approved">
                Everyone&apos;s in — nothing to chase.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {notSubmitted.map((m) => (
                  <li key={m.id}>
                    <Nameplate alias={m.display_name} size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
