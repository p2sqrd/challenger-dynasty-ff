import { Nameplate } from "@/components/Nameplate";
import { resolveTeam } from "@/lib/teams";
import {
  POST_KEEPER_2025,
  FINAL_STANDINGS_2025,
  type FinalStanding2025,
} from "@/lib/rankings-2025";

/** 1 → "1st", 2 → "2nd", … */
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

// Join the two datasets on canonical team key: preseason rank ⇄ actual finish.
const rankedByKey = new Map<string, number>();
POST_KEEPER_2025.forEach((alias, i) =>
  rankedByKey.set(resolveTeam(alias).key, i + 1)
);
const finishByKey = new Map<string, number>();
FINAL_STANDINGS_2025.forEach((s) =>
  finishByKey.set(resolveTeam(s.alias).key, s.rank)
);

/** delta = ranked − finished; positive = finished better than ranked. */
function deltaFor(key: string): number | null {
  const ranked = rankedByKey.get(key);
  const finished = finishByKey.get(key);
  if (ranked === undefined || finished === undefined) return null;
  return ranked - finished;
}

const ROW = "flex h-20 items-center gap-3 px-4";

/** Colored ▲N / ▼N pill (or a neutral "even") for a rank-vs-finish delta. */
function MovementBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (delta === 0) {
    return (
      <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        even
      </span>
    );
  }
  const rose = delta > 0;
  const color = rose ? "var(--color-approved)" : "var(--color-rejected)";
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold tabular"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
      title={`${rose ? "Up" : "Down"} ${Math.abs(delta)} from preseason ranking`}
    >
      {rose ? "▲" : "▼"}
      {Math.abs(delta)}
    </span>
  );
}

/** Muted "finished/ranked Nth" caption with the delta colored inline. */
function DeltaHint({
  label,
  place,
  delta,
}: {
  label: string;
  place: number | undefined;
  delta: number | null;
}) {
  if (place === undefined) return null;
  const color =
    delta === null || delta === 0
      ? "var(--color-muted)"
      : delta > 0
      ? "var(--color-approved)"
      : "var(--color-rejected)";
  return (
    <span className="text-xs text-muted">
      {label} {ordinal(place)}
      {delta !== null && delta !== 0 && (
        <span className="ml-1 font-semibold" style={{ color }}>
          ({delta > 0 ? "▲" : "▼"}
          {Math.abs(delta)})
        </span>
      )}
    </span>
  );
}

function ColumnHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 flex h-8 items-center px-4 text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </h3>
  );
}

/** Left column: the preseason ranking, each row noting where the team finished. */
function RankingColumn() {
  return (
    <div>
      <ColumnHeader>Post-Keeper Ranking</ColumnHeader>
      <ol className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
        {POST_KEEPER_2025.map((alias, i) => {
          const key = resolveTeam(alias).key;
          return (
            <li key={alias} className={ROW}>
              <span className="nameplate-type w-7 shrink-0 text-2xl leading-none text-muted">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <Nameplate alias={alias} />
                <DeltaHint
                  label="finished"
                  place={finishByKey.get(key)}
                  delta={deltaFor(key)}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Right column: the actual finish, each row noting its preseason rank + move. */
function StandingsColumn() {
  return (
    <div>
      <ColumnHeader>Actual Final Standings</ColumnHeader>
      <ol className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
        {FINAL_STANDINGS_2025.map((s) => {
          const key = resolveTeam(s.alias).key;
          const delta = deltaFor(key);
          return (
            <li key={s.rank} className={ROW}>
              <span className="nameplate-type w-7 shrink-0 text-2xl leading-none text-muted">
                {s.rank}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <Nameplate alias={s.alias} />
                  <MovementBadge delta={delta} />
                </div>
                <span className="truncate text-xs text-muted">
                  {s.teamName}
                  <DeltaHintInline place={rankedByKey.get(key)} />
                </span>
              </div>
              <div className="shrink-0 text-right text-xs text-muted">
                <div className="tabular text-sm font-semibold text-ink">
                  {s.wins}-{s.losses}
                </div>
                <div className="tabular">
                  PF {s.pf} · PA {s.pa}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** " · ranked 2nd" tail inside the muted team-name line. */
function DeltaHintInline({ place }: { place: number | undefined }) {
  if (place === undefined) return null;
  return <> · ranked {ordinal(place)}</>;
}

/** A single callout tile in the highlights strip. */
function HighlightTile({
  label,
  standing,
  accent,
}: {
  label: string;
  standing: FinalStanding2025 | undefined;
  accent: string;
}) {
  if (!standing) return null;
  const key = resolveTeam(standing.alias).key;
  const ranked = rankedByKey.get(key);
  const delta = deltaFor(key);
  return (
    <div
      className="rounded-md border bg-surface px-4 py-3"
      style={{ borderColor: `color-mix(in srgb, ${accent} 45%, transparent)` }}
    >
      <div
        className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: accent }}
      >
        {label}
      </div>
      <div className="mb-1 flex items-center gap-2">
        <Nameplate alias={standing.alias} />
        <MovementBadge delta={delta} />
      </div>
      <div className="text-xs text-muted">
        {ranked !== undefined && <>ranked {ordinal(ranked)} → </>}
        finished {ordinal(standing.rank)}
      </div>
    </div>
  );
}

/**
 * The "2025" Rankings tab: last year's Post-Keeper ranking and the actual final
 * standings, side by side and aligned row-for-row, with each team's movement
 * (rank → finish) called out so over- and under-performers jump out.
 */
export function Rankings2025() {
  const withDelta = FINAL_STANDINGS_2025.filter(
    (s) => deltaFor(resolveTeam(s.alias).key) !== null
  );
  const riser = [...withDelta].sort(
    (a, b) =>
      deltaFor(resolveTeam(b.alias).key)! - deltaFor(resolveTeam(a.alias).key)!
  )[0];
  const faller = [...withDelta].sort(
    (a, b) =>
      deltaFor(resolveTeam(a.alias).key)! - deltaFor(resolveTeam(b.alias).key)!
  )[0];
  const nailed = withDelta.filter(
    (s) => deltaFor(resolveTeam(s.alias).key) === 0
  );

  return (
    <div>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Where every team was ranked heading into 2025 versus where they actually
        finished. Green means they beat their ranking; red means they fell short.
      </p>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <HighlightTile
          label="Biggest riser"
          standing={riser}
          accent="var(--color-approved)"
        />
        <HighlightTile
          label="Biggest faller"
          standing={faller}
          accent="var(--color-rejected)"
        />
        {nailed.length > 0 && (
          <HighlightTile
            label="Called it"
            standing={nailed[0]}
            accent="var(--color-brand)"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankingColumn />
        <StandingsColumn />
      </div>
    </div>
  );
}
