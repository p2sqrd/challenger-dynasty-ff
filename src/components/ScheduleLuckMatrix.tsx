import type { ScheduleLuck } from "@/lib/schedule-luck";

function recordText(r: { wins: number; losses: number; ties: number }) {
  return r.ties > 0 ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`;
}

function signed(n: number, decimals = 0) {
  const v = decimals ? n.toFixed(decimals) : String(n);
  if (n > 0) return `+${v}`;
  if (n < 0) return `−${decimals ? Math.abs(n).toFixed(decimals) : Math.abs(n)}`;
  return decimals ? v : "0";
}

function deltaText(delta: number) {
  return delta > 0 ? "text-approved" : delta < 0 ? "text-rejected" : "text-muted";
}

/** Green/red wash whose strength grows with the size of the swing. */
function deltaWash(delta: number): React.CSSProperties | undefined {
  if (delta === 0) return undefined;
  const token = delta > 0 ? "--color-approved" : "--color-rejected";
  const pct = Math.min(12 + Math.abs(delta) * 6, 42);
  return {
    backgroundColor: `color-mix(in srgb, var(${token}) ${pct}%, transparent)`,
  };
}

export function ScheduleLuckMatrix({ data }: { data: ScheduleLuck }) {
  const { teams } = data;

  return (
    <div className="overflow-x-auto rounded-md border border-line bg-surface">
      <table className="min-w-[880px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className="sticky left-0 z-10 bg-surface px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
              Team \ Schedule
            </th>
            {teams.map((t) => (
              <th
                key={t.rosterId}
                className="px-1 py-3 text-center text-xs font-medium text-muted"
              >
                <span className="flex flex-col items-center gap-1">
                  <span
                    aria-hidden
                    className="h-1 w-5 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className={t.active ? "text-ink" : "text-muted"}>
                    {t.name}
                  </span>
                </span>
              </th>
            ))}
            <th className="px-2 py-3 text-center text-xs font-medium uppercase tracking-wide text-gold">
              Luck
            </th>
          </tr>
        </thead>
        <tbody>
          {teams.map((row) => (
            <tr key={row.rosterId} className="border-b border-line last:border-0">
              {/* Row header: team + real record, sticky while scrolling across. */}
              <th className="sticky left-0 z-10 bg-surface px-3 py-2 text-left font-medium">
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <span
                    aria-hidden
                    className="h-4 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className={`nameplate-type ${row.active ? "text-ink" : "text-muted"}`}>
                    {row.name}
                  </span>
                  <span className="tabular text-xs text-muted">
                    {recordText(row.actual)}
                  </span>
                </span>
              </th>

              {teams.map((col) => {
                const cell = row.vs[col.rosterId];
                const isSelf = col.rosterId === row.rosterId;
                if (isSelf) {
                  return (
                    <td
                      key={col.rosterId}
                      className="px-1 py-2 text-center ring-1 ring-inset ring-line"
                      title={`${row.name}'s actual record`}
                    >
                      <div className="tabular text-sm font-semibold text-ink">
                        {recordText(row.actual)}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-muted">
                        actual
                      </div>
                    </td>
                  );
                }
                return (
                  <td
                    key={col.rosterId}
                    className="px-1 py-2 text-center"
                    style={deltaWash(cell.delta)}
                    title={`${row.name} playing ${col.name}'s schedule: ${recordText(cell)} (${signed(cell.delta)} wins)`}
                  >
                    <div className={`tabular text-sm font-semibold ${deltaText(cell.delta)}`}>
                      {signed(cell.delta)}
                    </div>
                    <div className="tabular text-[10px] text-muted">
                      {recordText(cell)}
                    </div>
                  </td>
                );
              })}

              <td className="px-2 py-2 text-center">
                <span
                  className={`tabular text-sm font-semibold ${deltaText(row.luck)}`}
                  title="Real wins minus the average wins under every other team's schedule. Positive = softer schedule than average."
                >
                  {signed(row.luck, 1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
