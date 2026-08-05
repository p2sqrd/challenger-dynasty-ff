import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import { unvotedCountByManager } from "@/lib/keeper-gate";
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
  // A keeper set only counts once its manager has voted on every open rule
  // proposal, so split the submitters into "accepted" and "still needs to vote."
  const unvotedByManager = await unvotedCountByManager(
    supabase,
    activeSeason.id,
    roster.map((m) => m.id)
  );
  const submitted = roster.filter((m) => submittedIds.has(m.id));
  const accepted = submitted.filter(
    (m) => (unvotedByManager.get(m.id) ?? 0) === 0
  );
  const needsVote = submitted.filter(
    (m) => (unvotedByManager.get(m.id) ?? 0) > 0
  );
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
          there&apos;s nothing to approve. Keepers only count once a manager has
          voted on every open rule proposal, so you can chase anyone who&apos;s
          submitted but hasn&apos;t voted, or hasn&apos;t submitted at all — but{" "}
          <span className="text-ink">not what anyone kept or how they voted</span>{" "}
          — that stays private for everyone (you included) until the deadline.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-md border border-line bg-surface p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
              <span className="inline-block h-2 w-2 rounded-full bg-approved" />
              Accepted ({accepted.length})
            </div>
            {accepted.length === 0 ? (
              <p className="text-sm text-muted">No accepted keepers yet.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {accepted.map((m) => (
                  <li key={m.id}>
                    <Nameplate alias={m.display_name} size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-md border border-line bg-surface p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
              <span className="inline-block h-2 w-2 rounded-full bg-rejected" />
              Submitted, hasn&apos;t voted ({needsVote.length})
            </div>
            {needsVote.length === 0 ? (
              <p className="text-sm text-muted">No one&apos;s stuck here.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {needsVote.map((m) => (
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
              Not submitted ({notSubmitted.length})
            </div>
            {notSubmitted.length === 0 ? (
              <p className="text-sm text-approved">
                Everyone&apos;s submitted.
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
