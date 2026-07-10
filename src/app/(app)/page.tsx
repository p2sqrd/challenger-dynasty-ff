interface YearRecord {
  w: number | null;
  l: number | null;
  playoffs: number | null;
}

interface ManagerStanding {
  name: string;
  w: number;
  l: number;
  winPct: number;
  rsTitles: number | null;
  playoffApps: number | null;
  semis: number | null;
  finals: number | null;
  champs: number | null;
  sacko: number | null;
  byYear: Record<number, YearRecord>;
}

const YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];

const STANDINGS: ManagerStanding[] = [
  { name: "Hirsch", w: 50, l: 59, winPct: 0.4587155963, rsTitles: 1, playoffApps: 2, semis: 2, finals: 2, champs: 0, sacko: 0, byYear: { 2025: { w: 5, l: 9, playoffs: 0 }, 2024: { w: 4, l: 10, playoffs: 0 }, 2023: { w: 10, l: 4, playoffs: 3 }, 2022: { w: 7, l: 7, playoffs: 0 }, 2021: { w: 7, l: 7, playoffs: 0 }, 2020: { w: 7, l: 6, playoffs: 3 }, 2019: { w: 6, l: 7, playoffs: 0 }, 2018: { w: 4, l: 9, playoffs: 0 } } },
  { name: "Mukund", w: 64, l: 45, winPct: 0.5871559633, rsTitles: 0, playoffApps: 5, semis: 5, finals: 4, champs: 4, sacko: 0, byYear: { 2025: { w: 10, l: 4, playoffs: 2 }, 2024: { w: 5, l: 9, playoffs: 0 }, 2023: { w: 9, l: 5, playoffs: 4 }, 2022: { w: 5, l: 9, playoffs: 0 }, 2021: { w: 8, l: 6, playoffs: 4 }, 2020: { w: 10, l: 3, playoffs: 4 }, 2019: { w: 8, l: 5, playoffs: 2 }, 2018: { w: 9, l: 4, playoffs: 4 } } },
  { name: "Omar", w: 74, l: 35, winPct: 0.6788990826, rsTitles: 3, playoffApps: 6, semis: 6, finals: 2, champs: 0, sacko: 0, byYear: { 2025: { w: 9, l: 5, playoffs: 1 }, 2024: { w: 11, l: 3, playoffs: 2 }, 2023: { w: 8, l: 6, playoffs: 2 }, 2022: { w: 11, l: 3, playoffs: 2 }, 2021: { w: 9, l: 5, playoffs: 3 }, 2020: { w: 7, l: 6, playoffs: 0 }, 2019: { w: 9, l: 4, playoffs: 3 }, 2018: { w: 10, l: 3, playoffs: 2 } } },
  { name: "Pranav", w: 60, l: 49, winPct: 0.5504587156, rsTitles: 1, playoffApps: 4, semis: 3, finals: 2, champs: 0, sacko: 0, byYear: { 2025: { w: 7, l: 7, playoffs: 0 }, 2024: { w: 9, l: 5, playoffs: 3 }, 2023: { w: 7, l: 7, playoffs: 0 }, 2022: { w: 7, l: 7, playoffs: 0 }, 2021: { w: 9, l: 5, playoffs: 2 }, 2020: { w: 7, l: 6, playoffs: 2 }, 2019: { w: 6, l: 7, playoffs: 0 }, 2018: { w: 8, l: 5, playoffs: 3 } } },
  { name: "Kartik", w: 42, l: 67, winPct: 0.3853211009, rsTitles: 0, playoffApps: 3, semis: 1, finals: 0, champs: 0, sacko: 1, byYear: { 2025: { w: 3, l: 11, playoffs: 0 }, 2024: { w: 6, l: 8, playoffs: 1 }, 2023: { w: 3, l: 11, playoffs: 0 }, 2022: { w: 6, l: 8, playoffs: 0 }, 2021: { w: 4, l: 10, playoffs: 0 }, 2020: { w: 4, l: 9, playoffs: 0 }, 2019: { w: 9, l: 4, playoffs: 2 }, 2018: { w: 7, l: 6, playoffs: 1 } } },
  { name: "Aditya", w: 50, l: 59, winPct: 0.4587155963, rsTitles: 1, playoffApps: 1, semis: 1, finals: 0, champs: 0, sacko: 0, byYear: { 2025: { w: 10, l: 4, playoffs: 3 }, 2024: { w: 11, l: 3, playoffs: 2 }, 2023: { w: 7, l: 7, playoffs: 0 }, 2022: { w: 6, l: 8, playoffs: 0 }, 2021: { w: 5, l: 9, playoffs: 0 }, 2020: { w: 3, l: 10, playoffs: 0 }, 2019: { w: 4, l: 9, playoffs: 0 }, 2018: { w: 4, l: 9, playoffs: 0 } } },
  { name: "Arun", w: 52, l: 57, winPct: 0.4770642202, rsTitles: 0, playoffApps: 3, semis: 3, finals: 0, champs: 0, sacko: 1, byYear: { 2025: { w: 5, l: 9, playoffs: 0 }, 2024: { w: 6, l: 8, playoffs: 0 }, 2023: { w: 9, l: 5, playoffs: 2 }, 2022: { w: 10, l: 4, playoffs: 2 }, 2021: { w: 9, l: 5, playoffs: 2 }, 2020: { w: 6, l: 7, playoffs: 0 }, 2019: { w: 1, l: 12, playoffs: 0 }, 2018: { w: 6, l: 7, playoffs: 0 } } },
  { name: "Harish", w: 45, l: 64, winPct: 0.4128440367, rsTitles: 0, playoffApps: 1, semis: 0, finals: 0, champs: 0, sacko: 1, byYear: { 2025: { w: 7, l: 7, playoffs: 1 }, 2024: { w: 5, l: 9, playoffs: 0 }, 2023: { w: 3, l: 11, playoffs: 0 }, 2022: { w: 7, l: 7, playoffs: 1 }, 2021: { w: 7, l: 7, playoffs: 0 }, 2020: { w: 4, l: 9, playoffs: 0 }, 2019: { w: 7, l: 6, playoffs: 0 }, 2018: { w: 5, l: 8, playoffs: 0 } } },
  { name: "Villages (Vijay)", w: 59, l: 50, winPct: 0.5412844037, rsTitles: 0, playoffApps: 5, semis: 2, finals: 1, champs: 1, sacko: 0, byYear: { 2025: { w: 9, l: 5, playoffs: 2 }, 2024: { w: 5, l: 9, playoffs: 0 }, 2023: { w: 8, l: 6, playoffs: 1 }, 2022: { w: 8, l: 6, playoffs: 4 }, 2021: { w: 8, l: 6, playoffs: 1 }, 2020: { w: 8, l: 5, playoffs: 1 }, 2019: { w: 3, l: 10, playoffs: 0 }, 2018: { w: 10, l: 3, playoffs: 2 } } },
  { name: "Ari", w: 51, l: 58, winPct: 0.4678899083, rsTitles: 0, playoffApps: 3, semis: 2, finals: 2, champs: 1, sacko: 1, byYear: { 2025: { w: 5, l: 9, playoffs: 0 }, 2024: { w: 10, l: 4, playoffs: 4 }, 2023: { w: 7, l: 7, playoffs: 0 }, 2022: { w: 7, l: 7, playoffs: 3 }, 2021: { w: 5, l: 9, playoffs: 0 }, 2020: { w: 2, l: 11, playoffs: 0 }, 2019: { w: 8, l: 5, playoffs: 1 }, 2018: { w: 7, l: 6, playoffs: 1 } } },
  { name: "Chuggy's Lil Angels (Ahmad)", w: 48, l: 47, winPct: 0.5052631579, rsTitles: 0, playoffApps: 5, semis: 0, finals: 0, champs: 0, sacko: 1, byYear: { 2025: { w: null, l: null, playoffs: null }, 2024: { w: 8, l: 6, playoffs: 1 }, 2023: { w: 8, l: 6, playoffs: 1 }, 2022: { w: 2, l: 12, playoffs: 0 }, 2021: { w: 7, l: 7, playoffs: 1 }, 2020: { w: 9, l: 4, playoffs: 1 }, 2019: { w: 8, l: 5, playoffs: 1 }, 2018: { w: 6, l: 7, playoffs: 0 } } },
  { name: "Murali", w: 45, l: 50, winPct: 0.4736842105, rsTitles: 1, playoffApps: 3, semis: 2, finals: 1, champs: 1, sacko: 1, byYear: { 2025: { w: 3, l: 11, playoffs: 0 }, 2024: { w: 3, l: 10, playoffs: 0 }, 2023: { w: 5, l: 9, playoffs: 0 }, 2022: { w: 8, l: 6, playoffs: 1 }, 2021: { w: 6, l: 8, playoffs: 0 }, 2020: { w: 11, l: 2, playoffs: 2 }, 2019: { w: 9, l: 4, playoffs: 4 }, 2018: { w: null, l: null, playoffs: null } } },
  { name: "Josh", w: 2, l: 11, winPct: 0.1538461538, rsTitles: 0, playoffApps: 0, semis: 0, finals: 0, champs: 0, sacko: 1, byYear: { 2025: { w: null, l: null, playoffs: null }, 2024: { w: null, l: null, playoffs: null }, 2023: { w: null, l: null, playoffs: null }, 2022: { w: null, l: null, playoffs: null }, 2021: { w: null, l: null, playoffs: null }, 2020: { w: null, l: null, playoffs: null }, 2019: { w: null, l: null, playoffs: null }, 2018: { w: 2, l: 11, playoffs: 0 } } },
  { name: "Harsha", w: 10, l: 4, winPct: 0.7142857143, rsTitles: null, playoffApps: null, semis: null, finals: null, champs: null, sacko: null, byYear: { 2025: { w: 10, l: 4, playoffs: 4 }, 2024: { w: null, l: null, playoffs: null }, 2023: { w: null, l: null, playoffs: null }, 2022: { w: null, l: null, playoffs: null }, 2021: { w: null, l: null, playoffs: null }, 2020: { w: null, l: null, playoffs: null }, 2019: { w: null, l: null, playoffs: null }, 2018: { w: null, l: null, playoffs: null } } },
];

const BY_WIN_PCT = [...STANDINGS].sort((a, b) => b.winPct - a.winPct);

export default function StandingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Standings</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Career records through the 2025 season. Static for now — live sync
        from Sleeper lands in Phase 3.
      </p>

      <section className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
              <th className="py-2 pr-4 font-normal">Manager</th>
              <th className="py-2 pr-4 font-normal">W</th>
              <th className="py-2 pr-4 font-normal">L</th>
              <th className="py-2 pr-4 font-normal">Win%</th>
              <th className="py-2 pr-4 font-normal">Reg. season titles</th>
              <th className="py-2 pr-4 font-normal">Playoff apps</th>
              <th className="py-2 pr-4 font-normal">Semifinals</th>
              <th className="py-2 pr-4 font-normal">Finals</th>
              <th className="py-2 pr-4 font-normal">Champs</th>
              <th className="py-2 font-normal">Sacko</th>
            </tr>
          </thead>
          <tbody>
            {BY_WIN_PCT.map((m) => (
              <tr
                key={m.name}
                className="border-b border-neutral-100 dark:border-neutral-900"
              >
                <td className="py-2 pr-4 font-medium">{m.name}</td>
                <td className="py-2 pr-4">{m.w}</td>
                <td className="py-2 pr-4">{m.l}</td>
                <td className="py-2 pr-4">{(m.winPct * 100).toFixed(1)}%</td>
                <td className="py-2 pr-4">{m.rsTitles ?? "—"}</td>
                <td className="py-2 pr-4">{m.playoffApps ?? "—"}</td>
                <td className="py-2 pr-4">{m.semis ?? "—"}</td>
                <td className="py-2 pr-4">{m.finals ?? "—"}</td>
                <td className="py-2 pr-4">{m.champs ?? "—"}</td>
                <td className="py-2">{m.sacko ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Season by season</h2>
        <p className="mt-1 text-sm text-neutral-500">
          W-L each year, with playoff round reached in parentheses (0 = missed
          playoffs).
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
                <th className="py-2 pr-4 font-normal">Manager</th>
                {YEARS.map((year) => (
                  <th key={year} className="py-2 pr-4 font-normal">
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BY_WIN_PCT.map((m) => (
                <tr
                  key={m.name}
                  className="border-b border-neutral-100 dark:border-neutral-900"
                >
                  <td className="py-2 pr-4 font-medium">{m.name}</td>
                  {YEARS.map((year) => {
                    const rec = m.byYear[year];
                    return (
                      <td key={year} className="py-2 pr-4 text-neutral-500">
                        {rec.w === null ? "—" : `${rec.w}-${rec.l} (${rec.playoffs})`}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
