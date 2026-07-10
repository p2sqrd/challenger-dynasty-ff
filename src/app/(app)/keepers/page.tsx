import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { getAllPlayers, getLeagueRosters } from "@/lib/sleeper/client";
import { KeeperSelectionForm } from "@/components/KeeperSelectionForm";
import type { EligiblePlayer } from "@/components/KeeperSelectionForm";

export default async function KeepersPage() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  if (!manager) {
    return (
      <p className="text-sm text-neutral-500">
        Your login isn&apos;t linked to a manager yet — ask your commissioner
        to add your email to your manager record.
      </p>
    );
  }

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "active")
    .single();

  if (!activeSeason) {
    return (
      <p className="text-sm text-neutral-500">
        No active season configured yet — ask your commissioner to open one.
      </p>
    );
  }

  const { data: priorSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("year", activeSeason.year - 1)
    .maybeSingle();

  const { data: priorRecords } = priorSeason
    ? await supabase
        .from("draft_records")
        .select("*")
        .eq("season_id", priorSeason.id)
        .eq("manager_id", manager.id)
    : { data: [] };

  const { data: existingKeepers } = await supabase
    .from("keepers")
    .select("*")
    .eq("season_id", activeSeason.id)
    .eq("manager_id", manager.id);

  const alreadyApproved = (existingKeepers ?? []).some(
    (k) => k.status === "approved"
  );

  const leagueId = process.env.SLEEPER_LEAGUE_ID!;
  const [rosters, allPlayers] = await Promise.all([
    getLeagueRosters(leagueId),
    getAllPlayers(),
  ]);
  const roster = rosters.find((r) => r.roster_id === manager.sleeper_roster_id);
  const rosterPlayerIds = roster?.players ?? [];

  const recordByPlayerId = new Map(
    (priorRecords ?? []).map((r) => [r.player_id, r])
  );

  const eligiblePlayers: EligiblePlayer[] = rosterPlayerIds.map((playerId) => {
    const record = recordByPlayerId.get(playerId);
    const sleeperPlayer = allPlayers[playerId];
    const fallbackName = `${sleeperPlayer?.first_name ?? ""} ${
      sleeperPlayer?.last_name ?? ""
    }`.trim();
    const playerName =
      record?.player_name ||
      sleeperPlayer?.full_name ||
      fallbackName ||
      playerId;

    return {
      playerId,
      playerName,
      priorRecord: record
        ? { price: record.price, source: record.source }
        : undefined,
    };
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">
        {activeSeason.year} Keeper Selection
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Starting budget ${activeSeason.starting_budget}. Keeping a player
        commits next season&apos;s budget — the remaining total must stay
        between $125 and $275.
      </p>

      {alreadyApproved ? (
        <div className="mt-6 rounded-md border border-neutral-200 p-4 text-sm dark:border-neutral-800">
          Your keepers for {activeSeason.year} are approved and locked in.
          <ul className="mt-2 list-disc pl-5">
            {(existingKeepers ?? []).map((k) => (
              <li key={k.id}>
                {k.player_name} — ${k.new_price}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <KeeperSelectionForm
          seasonId={activeSeason.id}
          startingBudget={activeSeason.starting_budget}
          maxKeepers={rosterPlayerIds.length || 16}
          eligiblePlayers={eligiblePlayers}
          existingSelections={existingKeepers ?? []}
        />
      )}
    </div>
  );
}
