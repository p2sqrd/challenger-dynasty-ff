import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { ApprovalQueue } from "@/components/ApprovalQueue";

export default async function KeeperApprovalPage() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  if (manager?.role !== "commissioner") {
    return (
      <>
        <PageHeader title="Approval Queue" />
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
        <PageHeader title="Approval Queue" />
        <p className="text-sm text-muted">No active season.</p>
      </>
    );
  }

  const { data: managers } = await supabase
    .from("managers")
    .select("id, display_name");
  const nameById = new Map((managers ?? []).map((m) => [m.id, m.display_name]));

  const { data: submitted } = await supabase
    .from("keepers")
    .select("*")
    .eq("season_id", activeSeason.id)
    .eq("status", "submitted")
    .order("created_at", { ascending: true });

  const { data: approved } = await supabase
    .from("keepers")
    .select("*")
    .eq("season_id", activeSeason.id)
    .eq("status", "approved")
    .order("manager_id", { ascending: true });

  const approvedByManager = new Map<string, typeof approved>();
  for (const k of approved ?? []) {
    const list = approvedByManager.get(k.manager_id) ?? [];
    list.push(k);
    approvedByManager.set(k.manager_id, list);
  }

  return (
    <div>
      <PageHeader
        title="Approval Queue"
        subtitle={`${activeSeason.year} keeper submissions awaiting your review.`}
      />

      <section>
        <h2 className="nameplate-type text-lg text-ink">Pending submissions</h2>
        <ApprovalQueue
          submissions={(submitted ?? []).map((k) => ({
            ...k,
            managerName: nameById.get(k.manager_id) ?? k.manager_id,
          }))}
        />
      </section>

      <section className="mt-12">
        <h2 className="nameplate-type text-lg text-ink">
          Commissioner checklist
        </h2>
        <p className="mt-1 text-sm text-muted">
          Approved keepers to key into Sleeper before the draft.
        </p>
        {approvedByManager.size === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing approved yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {Array.from(approvedByManager.entries()).map(([managerId, keepers]) => (
              <div
                key={managerId}
                className="rounded-md border border-line bg-surface p-4"
              >
                <Nameplate alias={nameById.get(managerId) ?? managerId} size="sm" />
                <ul className="mt-3 divide-y divide-line">
                  {(keepers ?? []).map((k) => (
                    <li
                      key={k.id}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <span className="text-ink">{k.player_name}</span>
                      <span className="tabular text-ink">${k.new_price}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
