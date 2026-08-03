import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { getPlayerNames } from "@/lib/players";
import { getManagerAuctionBudget } from "@/lib/budget";
import { getKeeperPrices } from "@/lib/keeper-price";
import { getLeagueRosters } from "@/lib/sleeper/client";
import { resolveTeam } from "@/lib/teams";
import { PageHeader } from "@/components/PageHeader";
import { TradeSimulator, type SimRoster } from "@/components/TradeSimulator";

export default async function TradeSimulatorPage() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, year, starting_budget")
    .eq("status", "active")
    .single();

  if (!activeSeason) {
    return <p className="text-sm text-neutral-500">No active season.</p>;
  }

  const { data: managers } = await supabase
    .from("managers")
    .select("id, display_name, sleeper_roster_id");

  // Everyone's current Sleeper roster, keeper prices for next season, and each
  // manager's auction budget. It's a private client-side sandbox, so we only
  // build it for a logged-in manager and let it fail soft — a Sleeper hiccup
  // just hides the tool rather than breaking the page.
  let simMe: SimRoster | null = null;
  let simOthers: SimRoster[] = [];
  if (manager) {
    try {
      const rosters = await getLeagueRosters(process.env.SLEEPER_LEAGUE_ID!);
      const playersByRosterId = new Map(
        rosters.map((r) => [r.roster_id, r.players ?? []])
      );
      const withRoster = (managers ?? [])
        .map((m) => ({
          manager: m,
          playerIds: playersByRosterId.get(m.sleeper_roster_id) ?? [],
        }))
        .filter((x) => x.playerIds.length > 0);

      const allPlayerIds = withRoster.flatMap((x) => x.playerIds);
      // Every manager's auction budget — the partner's keeper try-out needs
      // theirs too, not just the logged-in manager's.
      const [simNames, keeperPrices, budgets] = await Promise.all([
        getPlayerNames(supabase, allPlayerIds),
        getKeeperPrices(supabase, activeSeason.year, allPlayerIds),
        Promise.all(
          withRoster.map((x) =>
            getManagerAuctionBudget(
              supabase,
              activeSeason.id,
              x.manager.id,
              activeSeason.starting_budget
            )
          )
        ),
      ]);
      const budgetByManagerId = new Map(
        withRoster.map((x, i) => [x.manager.id, budgets[i]])
      );

      const toSimRoster = (x: (typeof withRoster)[number]): SimRoster => ({
        managerId: x.manager.id,
        name: resolveTeam(x.manager.display_name).name,
        auctionBudget:
          budgetByManagerId.get(x.manager.id) ?? activeSeason.starting_budget,
        roster: x.playerIds
          .map((playerId) => ({
            playerId,
            name: simNames.get(playerId) ?? playerId,
            keeperPrice: keeperPrices.get(playerId) ?? null,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      });

      simMe = withRoster.find((x) => x.manager.id === manager.id)
        ? toSimRoster(withRoster.find((x) => x.manager.id === manager.id)!)
        : null;
      simOthers = withRoster
        .filter((x) => x.manager.id !== manager.id)
        .map(toSimRoster);
    } catch {
      simMe = null;
    }
  }

  return (
    <div>
      <PageHeader
        title="Trade Simulator"
        subtitle="A private what-if tool — pick a partner, move players and cash, and see how your roster, budget, and keepers would look. Nothing is saved."
      />

      {simMe ? (
        <TradeSimulator me={simMe} others={simOthers} />
      ) : (
        <p className="text-sm text-muted">
          We couldn&apos;t load rosters right now — try again in a moment.
        </p>
      )}
    </div>
  );
}
