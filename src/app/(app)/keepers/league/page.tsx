import { createClient } from "@/lib/supabase/server";
import { unvotedCountByManager } from "@/lib/keeper-gate";
import { PageHeader } from "@/components/PageHeader";
import { AllKeepers, type LeagueRoster } from "@/components/AllKeepers";

export default async function LeagueKeepersPage() {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("id, year, keeper_deadline")
    .eq("status", "active")
    .single();

  if (!season) {
    return (
      <div>
        <PageHeader title="League Keepers" />
        <p className="text-sm text-muted">No active season configured yet.</p>
      </div>
    );
  }

  // Server component: "now" per request is intended.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const locked =
    season.keeper_deadline != null &&
    new Date(season.keeper_deadline).getTime() <= now;

  const [{ data: managers }, { data: ledger }, { data: keepers }] =
    await Promise.all([
      supabase.from("managers").select("id, display_name"),
      supabase
        .from("budget_ledger")
        .select("manager_id")
        .eq("season_id", season.id),
      supabase
        .from("keepers")
        .select("manager_id, player_id, player_name, new_price, status")
        .eq("season_id", season.id),
    ]);

  // Active managers this season = those with a budget entry (drops anyone who
  // has left the league), matching the Budget page.
  const activeIds = new Set((ledger ?? []).map((l) => l.manager_id));

  // A manager's keepers aren't accepted until they've voted on every open
  // proposal — flag anyone who still hasn't.
  const unvotedByManager = await unvotedCountByManager(supabase, season.id, [
    ...activeIds,
  ]);

  const keepersByManager = new Map<
    string,
    { playerId: string; playerName: string; price: number }[]
  >();
  for (const k of keepers ?? []) {
    const list = keepersByManager.get(k.manager_id) ?? [];
    list.push({
      playerId: k.player_id,
      playerName: k.player_name,
      price: k.new_price,
    });
    keepersByManager.set(k.manager_id, list);
  }

  const rosters: LeagueRoster[] = (managers ?? [])
    .filter((m) => activeIds.has(m.id))
    .map((m) => ({
      managerName: m.display_name,
      players: (keepersByManager.get(m.id) ?? []).sort(
        (a, b) => b.price - a.price
      ),
      pendingVote:
        (keepersByManager.get(m.id)?.length ?? 0) > 0 &&
        (unvotedByManager.get(m.id) ?? 0) > 0,
    }))
    .sort((a, b) => a.managerName.localeCompare(b.managerName));

  return (
    <div>
      <PageHeader
        title="League Keepers"
        subtitle="Everyone's kept players — revealed once the keeper deadline locks them in."
      />
      <AllKeepers rosters={rosters} locked={locked} />
    </div>
  );
}
