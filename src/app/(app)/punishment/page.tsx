import { PageHeader } from "@/components/PageHeader";

const FITNESS_PEOPLE = [
  "Joshua",
  "Arun* (Hirsch)",
  "Arihant",
  "Kartik",
  "Ahmad/Sankalp",
  "Harish",
];

const FITNESS_ROWS: { event: string; results: (string | null)[] }[] = [
  { event: "Pull-ups", results: [null, "12", "2", null, null, null] },
  { event: "Push-ups", results: [null, "39", "30", null, null, null] },
  { event: "Sit-ups", results: [null, null, "02:02:00", null, null, null] },
  { event: "Shuttle run", results: [null, null, null, null, null, null] },
  { event: "Mile time", results: [null, "06:06:00", "07:12:00", null, null, null] },
];

export default function PunishmentPage() {
  return (
    <div>
      <PageHeader
        title="Punishment Tracker"
        subtitle="Presidential Physical Fitness results from managers who had to run the gauntlet."
      />

      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <th className="py-3 pl-4 pr-4 text-left font-medium" />
              {FITNESS_PEOPLE.map((p) => (
                <th key={p} className="py-3 pr-4 text-left font-medium">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FITNESS_ROWS.map((row) => (
              <tr key={row.event} className="border-b border-line last:border-0">
                <td className="py-3 pl-4 pr-4 font-medium text-ink">
                  {row.event}
                </td>
                {row.results.map((r, i) => (
                  <td key={i} className="tabular py-3 pr-4 text-muted">
                    {r ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
