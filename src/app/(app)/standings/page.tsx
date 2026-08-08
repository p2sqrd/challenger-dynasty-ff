import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StandingsTable } from "@/components/StandingsTable";
import { STANDINGS, YEARS } from "@/lib/standings-data";

const BY_WIN_PCT = [...STANDINGS].sort((a, b) => b.winPct - a.winPct);

export default function StandingsPage() {
  return (
    <div>
      <PageHeader
        title="Historical Standings"
        subtitle="Career records through the 2025 season. Static for now — live sync from Sleeper lands in Phase 3."
      />

      <p className="-mt-2 mb-4 text-sm text-muted">
        Sorted by win percentage. Tap any column heading to re-sort.
      </p>
      <StandingsTable rows={STANDINGS} />

      <h2 className="nameplate-type mt-12 mb-4 text-xl text-ink">
        Season by season
      </h2>
      <p className="-mt-2 mb-4 text-sm text-muted">
        W-L each year, with playoff round reached in parentheses (0 = missed
        playoffs).
      </p>
      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <th className="py-3 pl-4 pr-4 text-left font-medium">Team</th>
              {YEARS.map((year) => (
                <th key={year} className="tabular py-3 pr-4 text-right font-medium">
                  {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BY_WIN_PCT.map((m) => (
              <tr
                key={m.name}
                className="border-b border-line transition-colors last:border-0 hover:bg-surface-2"
              >
                <td className="py-3 pl-4 pr-4">
                  <Nameplate alias={m.name} size="sm" />
                </td>
                {YEARS.map((year) => {
                  const rec = m.byYear[year];
                  return (
                    <td
                      key={year}
                      className="tabular py-3 pr-4 text-right text-muted"
                    >
                      {rec.w === null ? "—" : `${rec.w}-${rec.l} (${rec.playoffs})`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
