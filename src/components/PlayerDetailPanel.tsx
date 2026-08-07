import { Nameplate } from "./Nameplate";
import { KeeperCostChart } from "./KeeperCostChart";

export interface PlayerHistoryEntry {
  year: number;
  price: number;
  source: string;
  managerName: string;
}

export interface PlayerTradeEntry {
  year: number;
  managerName: string;
}

const SOURCE_VERB: Record<string, string> = {
  auction: "Drafted",
  keeper: "Kept",
  waiver: "Added off waivers",
};

interface TimelineRow {
  year: number;
  managerName: string;
  detail: string;
}

/** Merge draft/keeper records and trades into one reverse-chronological list. */
function buildTimeline(
  history: PlayerHistoryEntry[],
  trades: PlayerTradeEntry[]
): TimelineRow[] {
  const rows: TimelineRow[] = [];
  for (const h of history) {
    rows.push({
      year: h.year,
      managerName: h.managerName,
      detail: `${SOURCE_VERB[h.source] ?? h.source} · $${h.price}`,
    });
  }
  for (const t of trades) {
    rows.push({ year: t.year, managerName: t.managerName, detail: "Traded to" });
  }
  return rows.sort((a, b) => b.year - a.year);
}

/**
 * A player's history: keeper-cost-by-year chart plus a reverse-chronological
 * transaction timeline. Rendered inside an expanded Players-table row.
 */
export function PlayerDetailPanel({
  history,
  trades,
}: {
  history: PlayerHistoryEntry[];
  trades: PlayerTradeEntry[];
}) {
  const timeline = buildTimeline(history, trades);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section>
        <h3 className="nameplate-type text-sm text-muted">
          Keeper cost over the years
        </h3>
        <div className="mt-3 overflow-x-auto rounded-md border border-line bg-canvas p-4">
          <KeeperCostChart
            points={history.map((h) => ({
              year: h.year,
              price: h.price,
              source: h.source,
            }))}
          />
        </div>
      </section>

      <section>
        <h3 className="nameplate-type text-sm text-muted">
          Transaction history
        </h3>
        {timeline.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No league draft, keeper, or trade history.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-md border border-line bg-canvas">
            {timeline.map((row, i) => (
              <li
                key={i}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="flex items-center gap-3">
                  <span className="tabular w-12 text-muted">{row.year}</span>
                  <Nameplate alias={row.managerName} size="sm" />
                </span>
                <span className="text-muted">{row.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
