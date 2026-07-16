import { Nameplate } from "./Nameplate";
import { PlayerAvatar } from "./PlayerAvatar";

export interface LeagueRoster {
  managerName: string;
  players: { playerId: string; playerName: string; price: number }[];
}

/**
 * League-wide view of everyone's kept players. Before the keeper deadline
 * locks selections, rosters are hidden (so no one can scout others' plans);
 * once locked, each manager's kept players are revealed.
 */
export function AllKeepers({
  rosters,
  locked,
}: {
  rosters: LeagueRoster[];
  locked: boolean;
}) {
  if (!locked) {
    return (
      <div>
        <p className="mb-4 text-sm text-muted">
          Everyone&apos;s kept players appear here once the keeper deadline locks
          them in. Until then, rosters stay hidden.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {rosters.map((r) => (
            <div
              key={r.managerName}
              className="rounded-md border border-line bg-surface p-4"
            >
              <Nameplate alias={r.managerName} size="sm" />
              <p className="mt-3 text-sm text-muted">Not locked yet.</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rosters.map((r) => {
        const total = r.players.reduce((sum, p) => sum + p.price, 0);
        return (
          <div
            key={r.managerName}
            className="rounded-md border border-line bg-surface p-4"
          >
            <div className="flex items-center justify-between">
              <Nameplate alias={r.managerName} size="sm" />
              <span className="tabular text-xs text-muted">
                {r.players.length} kept · ${total}
              </span>
            </div>
            {r.players.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No keepers.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {r.players.map((p) => (
                  <li
                    key={p.playerId}
                    className="flex items-center gap-2.5 text-sm"
                  >
                    <PlayerAvatar
                      playerId={p.playerId}
                      name={p.playerName}
                      size={28}
                    />
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {p.playerName}
                    </span>
                    <span className="tabular text-ink">${p.price}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
