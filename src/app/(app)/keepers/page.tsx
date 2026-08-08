import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { getManagerAuctionBudget } from "@/lib/budget";
import { unvotedProposalCount } from "@/lib/keeper-gate";
import { getLeagueRosters } from "@/lib/sleeper/client";
import { getPlayerNames, getPlayerPositions } from "@/lib/players";
import { resolveTeam } from "@/lib/teams";
import { ROSTER_SIZE } from "@/lib/rules/budget-validation";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { KeeperSelectionForm } from "@/components/KeeperSelectionForm";
import type { EligiblePlayer } from "@/components/KeeperSelectionForm";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface p-5 text-sm text-muted">
      {children}
    </div>
  );
}

export default async function SetMyKeepersPage() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "active")
    .single();

  if (!season) {
    return (
      <div>
        <PageHeader title="Set My Keepers" />
        <Notice>
          No active season configured yet — ask your commissioner to open one.
        </Notice>
      </div>
    );
  }

  const deadline = season.keeper_deadline
    ? new Date(season.keeper_deadline)
    : null;
  // Server component: evaluating "now" per request is exactly what we want.
  // eslint-disable-next-line react-hooks/purity
  const locked = deadline !== null && deadline.getTime() <= Date.now();
  const deadlineLabel = deadline
    ? deadline.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div>
      <PageHeader
        title="Set My Keepers"
        subtitle="Lock in the players you're carrying into the 2026 auction."
      />
      <MyKeepers
        manager={manager}
        season={season}
        locked={locked}
        deadlineLabel={deadlineLabel}
      />
    </div>
  );
}

type Manager = NonNullable<Awaited<ReturnType<typeof getCurrentManager>>>;
type Season = {
  id: string;
  year: number;
  starting_budget: number;
  keeper_deadline: string | null;
  draft_datetime: string | null;
};

async function MyKeepers({
  manager,
  season,
  locked,
  deadlineLabel,
}: {
  manager: Manager | null;
  season: Season;
  locked: boolean;
  deadlineLabel: string | null;
}) {
  if (!manager) {
    return (
      <Notice>
        Your login isn&apos;t linked to a manager yet — ask your commissioner to
        add your email to your manager record.
      </Notice>
    );
  }

  const supabase = await createClient();
  const team = resolveTeam(manager.display_name);

  const { data: existingKeepers } = await supabase
    .from("keepers")
    .select("*")
    .eq("season_id", season.id)
    .eq("manager_id", manager.id);

  // Keepers only count once you've voted on every open rule proposal.
  const unvoted = await unvotedProposalCount(supabase, season.id, manager.id);
  const hasKeepers = (existingKeepers ?? []).length > 0;

  // Once the deadline has passed, keepers are locked — show a read-only card.
  if (locked) {
    const kept = existingKeepers ?? [];
    const total = kept.reduce((sum, k) => sum + k.new_price, 0);
    // If they never finished voting, their set isn't accepted — voting closed
    // with the deadline, so there's no way to fix it now.
    const notAccepted = hasKeepers && unvoted > 0;
    return (
      <div className="rounded-md border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          {notAccepted ? (
            <span className="flex items-center gap-2 text-sm text-rejected">
              <span className="inline-block h-2 w-2 rounded-full bg-rejected" />
              Not accepted for {season.year}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm text-ink">
              <span className="inline-block h-2 w-2 rounded-full bg-approved" />
              Locked in for {season.year}
            </span>
          )}
          <Nameplate team={team} size="sm" />
        </div>
        {notAccepted && (
          <p className="mb-3 rounded-md border border-rejected/40 bg-rejected/10 p-3 text-sm text-rejected">
            These keepers were not accepted — you didn&apos;t vote on all rule
            proposals before the deadline.
          </p>
        )}
        {kept.length === 0 ? (
          <p className="text-sm text-muted">
            You didn&apos;t keep anyone this year.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {kept.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-ink">{k.player_name}</span>
                <span className="tabular text-ink">${k.new_price}</span>
              </li>
            ))}
            <li className="flex items-center justify-between pt-2 text-sm font-medium">
              <span className="text-muted">Committed</span>
              <span className="tabular text-ink">${total}</span>
            </li>
          </ul>
        )}
      </div>
    );
  }

  const { data: priorSeason } = await supabase
    .from("seasons")
    .select("id")
    .eq("year", season.year - 1)
    .maybeSingle();

  // A keeper's salary follows the player across trades, so look up prior
  // prices by player across the whole league, not just this manager's picks.
  const { data: priorRecords } = priorSeason
    ? await supabase
        .from("draft_records")
        .select("*")
        .eq("season_id", priorSeason.id)
    : { data: [] };

  const auctionBudget = await getManagerAuctionBudget(
    supabase,
    season.id,
    manager.id,
    season.starting_budget
  );

  const leagueId = process.env.SLEEPER_LEAGUE_ID!;
  const rosters = await getLeagueRosters(leagueId);
  const roster = rosters.find((r) => r.roster_id === manager.sleeper_roster_id);
  const rosterPlayerIds = roster?.players ?? [];

  const recordByPlayerId = new Map(
    (priorRecords ?? []).map((r) => [r.player_id, r])
  );
  const [nameMap, positionMap] = await Promise.all([
    getPlayerNames(supabase, rosterPlayerIds),
    getPlayerPositions(supabase, rosterPlayerIds),
  ]);

  const eligiblePlayers: EligiblePlayer[] = rosterPlayerIds.map((playerId) => {
    const record = recordByPlayerId.get(playerId);
    return {
      playerId,
      playerName: record?.player_name || nameMap.get(playerId) || playerId,
      position: positionMap.get(playerId) ?? null,
      priorRecord: record
        ? { price: record.price, source: record.source }
        : undefined,
    };
  });

  return (
    <div>
      {unvoted > 0 &&
        (hasKeepers ? (
          <div className="mb-4 rounded-md border border-rejected/40 bg-rejected/10 p-4">
            <p className="text-sm font-medium text-rejected">
              ⚠ Your keepers will NOT be accepted until you vote
            </p>
            <p className="mt-1 text-sm text-muted">
              You&apos;ve submitted keepers, but they only count once you&apos;ve
              voted on all {unvoted} open rule proposal
              {unvoted === 1 ? "" : "s"}. Vote before the deadline or your
              keepers won&apos;t be accepted.
            </p>
            <Link
              href="/rule-proposals"
              className="mt-3 inline-block rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-[var(--color-brand-ink)]"
            >
              Vote on rule proposals →
            </Link>
          </div>
        ) : (
          <div className="mb-4 rounded-md border border-pending/40 bg-pending/10 p-4">
            <p className="text-sm font-medium text-pending">
              Vote before you can submit keepers
            </p>
            <p className="mt-1 text-sm text-muted">
              You need to vote on all {unvoted} open rule proposal
              {unvoted === 1 ? "" : "s"} before your keepers can be submitted.
            </p>
            <Link
              href="/rule-proposals"
              className="mt-3 inline-block rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-[var(--color-brand-ink)]"
            >
              Vote on rule proposals →
            </Link>
          </div>
        ))}

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          You have ${auctionBudget} for the auction. Keep as many players as you
          like, as long as you can still fill all {ROSTER_SIZE} roster spots ($1
          minimum each).
        </p>
        <Nameplate team={team} />
      </div>

      <KeeperSelectionForm
        seasonId={season.id}
        startingBudget={auctionBudget}
        rosterSize={ROSTER_SIZE}
        eligiblePlayers={eligiblePlayers}
        existingSelections={existingKeepers ?? []}
        deadlineLabel={deadlineLabel}
        unvotedCount={unvoted}
      />
    </div>
  );
}
