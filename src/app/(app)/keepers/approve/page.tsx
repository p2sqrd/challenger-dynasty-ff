import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { ApprovalQueue } from "@/components/ApprovalQueue";

export default async function KeeperApprovalPage() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  if (manager?.role !== "commissioner") {
    return (
      <p className="text-sm text-neutral-500">
        Commissioner access only.
      </p>
    );
  }

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "active")
    .single();

  if (!activeSeason) {
    return <p className="text-sm text-neutral-500">No active season.</p>;
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
      <h1 className="text-2xl font-semibold">
        Keeper Approval Queue — {activeSeason.year}
      </h1>

      <section className="mt-6">
        <h2 className="text-lg font-medium">Pending submissions</h2>
        <ApprovalQueue
          submissions={(submitted ?? []).map((k) => ({
            ...k,
            managerName: nameById.get(k.manager_id) ?? k.manager_id,
          }))}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">
          Commissioner checklist — approved keepers to key into Sleeper
        </h2>
        {approvedByManager.size === 0 && (
          <p className="mt-2 text-sm text-neutral-500">Nothing approved yet.</p>
        )}
        {Array.from(approvedByManager.entries()).map(([managerId, keepers]) => (
          <div key={managerId} className="mt-4">
            <h3 className="font-medium">{nameById.get(managerId) ?? managerId}</h3>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {(keepers ?? []).map((k) => (
                <li key={k.id}>
                  {k.player_name} — ${k.new_price}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
