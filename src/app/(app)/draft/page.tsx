import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { getManagerAuctionBudget } from "@/lib/budget";
import { getAllPlayers, getLeagueRosters } from "@/lib/sleeper/client";
import { resolveTeam } from "@/lib/teams";
import { ROSTER_SIZE } from "@/lib/rules/budget-validation";
import { KEEPER_DEADLINE, DRAFT_DATETIME } from "@/lib/draft-dates";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { CountdownTimers } from "@/components/CountdownTimers";
import { KeeperSelectionForm } from "@/components/KeeperSelectionForm";
import type { EligiblePlayer } from "@/components/KeeperSelectionForm";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface p-5 text-sm text-muted">
      {children}
    </div>
  );
}

async function KeeperSection() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  if (!manager) {
    return (
      <Notice>
        Your login isn&apos;t linked to a manager yet — ask your commissioner to
        add your email to your manager record.
      </Notice>
    );
  }

  const team = resolveTeam(manager.display_name);

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "active")
    .single();

  if (!activeSeason) {
    return (
      <Notice>
        No active season configured yet — ask your commissioner to open one.
      </Notice>
    );
  }

  const { data: priorSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("year", activeSeason.year - 1)
    .maybeSingle();

  // Look up prior prices by player across the whole league, not just this
  // manager's own draft picks — a keeper's salary follows the player through
  // trades, so a player acquired mid-season is kept off whatever they were
  // last drafted/kept for, regardless of who originally paid it.
  const { data: priorRecords } = priorSeason
    ? await supabase
        .from("draft_records")
        .select("*")
        .eq("season_id", priorSeason.id)
    : { data: [] };

  const { data: existingKeepers } = await supabase
    .from("keepers")
    .select("*")
    .eq("season_id", activeSeason.id)
    .eq("manager_id", manager.id);

  const alreadyApproved = (existingKeepers ?? []).some(
    (k) => k.status === "approved"
  );

  const auctionBudget = await getManagerAuctionBudget(
    supabase,
    activeSeason.id,
    manager.id,
    activeSeason.starting_budget
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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="nameplate-type text-xl text-ink">
            {activeSeason.year} Keepers
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            You have ${auctionBudget} for the auction. Keep as many players as
            you like, as long as you can still fill all {ROSTER_SIZE} roster
            spots ($1 minimum each).
          </p>
        </div>
        <Nameplate team={team} />
      </div>

      {alreadyApproved ? (
        <div className="rounded-md border border-line bg-surface p-5">
          <div className="flex items-center gap-2 text-sm text-approved">
            <span className="inline-block h-2 w-2 rounded-full bg-approved" />
            Your {activeSeason.year} keepers are approved and locked in.
          </div>
          <ul className="mt-4 divide-y divide-line">
            {(existingKeepers ?? []).map((k) => (
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
      ) : (
        <KeeperSelectionForm
          seasonId={activeSeason.id}
          startingBudget={auctionBudget}
          maxKeepers={Math.min(rosterPlayerIds.length || ROSTER_SIZE, ROSTER_SIZE)}
          rosterSize={ROSTER_SIZE}
          eligiblePlayers={eligiblePlayers}
          existingSelections={existingKeepers ?? []}
        />
      )}
    </div>
  );
}

export default function DraftPage() {
  return (
    <div>
      <PageHeader
        title="Draft"
        subtitle="Countdowns to the big dates, and your keeper selections below."
      />

      <CountdownTimers
        timers={[
          { label: "Keeper deadline", target: KEEPER_DEADLINE },
          { label: "Draft day", target: DRAFT_DATETIME },
        ]}
      />

      <div className="mt-10 border-t border-line pt-8">
        <KeeperSection />
      </div>
    </div>
  );
}
