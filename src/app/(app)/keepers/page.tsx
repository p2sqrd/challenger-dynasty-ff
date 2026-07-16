import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { getManagerAuctionBudget } from "@/lib/budget";
import { getLeagueRosters } from "@/lib/sleeper/client";
import { getPlayerNames } from "@/lib/players";
import { resolveTeam } from "@/lib/teams";
import { ROSTER_SIZE } from "@/lib/rules/budget-validation";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { CountdownTimers } from "@/components/CountdownTimers";
import { KeeperSelectionForm } from "@/components/KeeperSelectionForm";
import { AllKeepers, type LeagueRoster } from "@/components/AllKeepers";
import type { EligiblePlayer } from "@/components/KeeperSelectionForm";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface p-5 text-sm text-muted">
      {children}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="nameplate-type mb-4 text-xl text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default async function KeepersPage() {
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
        <PageHeader title="Keepers" />
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
        title="Keepers"
        subtitle="Lock in the players you're carrying into the 2026 auction."
      />

      <Section title="Upcoming">
        <CountdownTimers
          timers={[
            { label: "Keeper deadline", target: season.keeper_deadline },
            { label: "Draft day", target: season.draft_datetime },
          ]}
        />
      </Section>

      <Section title="My Keepers">
        <MyKeepers
          manager={manager}
          season={season}
          locked={locked}
          deadlineLabel={deadlineLabel}
        />
      </Section>

      <Section title="All Keepers">
        <AllKeepersSection season={season} locked={locked} />
      </Section>
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

  // Once the deadline has passed, keepers are locked — show a read-only card.
  if (locked) {
    const kept = existingKeepers ?? [];
    const total = kept.reduce((sum, k) => sum + k.new_price, 0);
    return (
      <div className="rounded-md border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-ink">
            <span className="inline-block h-2 w-2 rounded-full bg-approved" />
            Locked in for {season.year}
          </span>
          <Nameplate team={team} size="sm" />
        </div>
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
  const nameMap = await getPlayerNames(supabase, rosterPlayerIds);

  const eligiblePlayers: EligiblePlayer[] = rosterPlayerIds.map((playerId) => {
    const record = recordByPlayerId.get(playerId);
    return {
      playerId,
      playerName: record?.player_name || nameMap.get(playerId) || playerId,
      priorRecord: record
        ? { price: record.price, source: record.source }
        : undefined,
    };
  });

  return (
    <div>
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
      />
    </div>
  );
}

async function AllKeepersSection({
  season,
  locked,
}: {
  season: Season;
  locked: boolean;
}) {
  const supabase = await createClient();

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
    }))
    .sort((a, b) => a.managerName.localeCompare(b.managerName));

  return <AllKeepers rosters={rosters} locked={locked} />;
}
