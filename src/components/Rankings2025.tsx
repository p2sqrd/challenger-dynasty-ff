import { Nameplate } from "@/components/Nameplate";
import {
  POST_KEEPER_2025,
  FINAL_STANDINGS_2025,
} from "@/lib/rankings-2025";

/** The 2025 Post-Keeper Rankings — a simple ranked list, as originally posted. */
function PostKeeper2025() {
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
      {POST_KEEPER_2025.map((alias, i) => (
        <li
          key={alias}
          className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2"
        >
          <span className="nameplate-type w-8 shrink-0 text-2xl leading-none text-muted">
            {i + 1}
          </span>
          <Nameplate alias={alias} />
        </li>
      ))}
    </ol>
  );
}

/** The 2025 Actual Final Standings, mirroring Sleeper's regular-season finish. */
function FinalStandings2025() {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-surface">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <th className="py-3 pl-4 pr-3 text-left font-medium">#</th>
            <th className="py-3 pr-4 text-left font-medium">Team</th>
            <th className="py-3 pr-4 text-right font-medium">Record</th>
            <th className="tabular py-3 pr-4 text-right font-medium">PF</th>
            <th className="tabular py-3 pr-4 text-right font-medium">PA</th>
            <th className="py-3 pr-4 text-right font-medium">Waiver</th>
          </tr>
        </thead>
        <tbody>
          {FINAL_STANDINGS_2025.map((s) => (
            <tr
              key={s.rank}
              className="border-b border-line transition-colors last:border-0 hover:bg-surface-2"
            >
              <td className="tabular py-3 pl-4 pr-3 text-muted">{s.rank}</td>
              <td className="py-3 pr-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-ink">{s.teamName}</span>
                  <Nameplate alias={s.alias} size="sm" />
                </div>
              </td>
              <td className="tabular py-3 pr-4 text-right text-ink">
                {s.wins}-{s.losses}
              </td>
              <td className="tabular py-3 pr-4 text-right text-muted">{s.pf}</td>
              <td className="tabular py-3 pr-4 text-right text-muted">{s.pa}</td>
              <td className="tabular py-3 pr-4 text-right text-muted">
                ${s.waiverBudget}{" "}
                <span className="text-xs">({s.waiverOrder})</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The "2025" Rankings tab: last year's Post-Keeper Rankings side by side with
 * how the season actually finished.
 */
export function Rankings2025() {
  return (
    <div>
      <section className="mb-12">
        <h2 className="nameplate-type mb-1 text-2xl leading-none text-ink">
          2025 Post-Keeper Rankings
        </h2>
        <p className="mb-4 text-sm text-muted">
          Where every team was ranked heading into the 2025 draft.
        </p>
        <PostKeeper2025 />
      </section>

      <section>
        <h2 className="nameplate-type mb-1 text-2xl leading-none text-ink">
          2025 Actual Final Standings
        </h2>
        <p className="mb-4 text-sm text-muted">
          How the regular season actually shook out.
        </p>
        <FinalStandings2025 />
      </section>
    </div>
  );
}
