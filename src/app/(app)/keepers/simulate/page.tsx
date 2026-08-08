import { createClient } from "@/lib/supabase/server";
import { loadSimTeams, type SimSelections } from "@/lib/keeper-sim";
import { getCurrentManager } from "@/lib/managers";
import { PageHeader } from "@/components/PageHeader";
import { KeeperSimulator } from "@/components/KeeperSimulator";

export default async function SimulateKeepersPage() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  const { data: season } = await supabase
    .from("seasons")
    .select("id, year, starting_budget")
    .eq("status", "active")
    .maybeSingle();

  if (!season) {
    return (
      <div>
        <PageHeader title="Simulate Keepers" />
        <p className="text-sm text-muted">No active season configured yet.</p>
      </div>
    );
  }

  const teams = await loadSimTeams(supabase, season);

  // Pre-fill keepers from the DB. The keepers RLS returns only your own picks
  // before the deadline (everyone's after it), so this pre-fills your real
  // keepers now and the whole league's once picks are public — no extra logic.
  const { data: keepers } = await supabase
    .from("keepers")
    .select("manager_id, player_id")
    .eq("season_id", season.id);
  const prefill: SimSelections = {};
  for (const k of keepers ?? []) {
    (prefill[k.manager_id] ??= []).push(k.player_id);
  }

  return (
    <div>
      <PageHeader
        title="Simulate Keepers"
        subtitle="A private what-if: pick keepers for every team, then simulate the draft pool and everyone's remaining budget. Your own real keepers are pre-filled; nothing here is saved to the league."
      />
      <KeeperSimulator
        teams={teams}
        prefill={prefill}
        myManagerId={manager?.id ?? null}
      />
    </div>
  );
}
