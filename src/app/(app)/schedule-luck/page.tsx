import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ScheduleLuckMatrix } from "@/components/ScheduleLuckMatrix";
import { getCompletedSeasons, getScheduleLuck } from "@/lib/schedule-luck";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface p-5 text-sm text-muted">
      {children}
    </div>
  );
}

export default async function ScheduleLuckPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season } = await searchParams;
  const leagueId = process.env.SLEEPER_LEAGUE_ID;

  const header = (
    <PageHeader
      title="Schedule Luck"
      subtitle="Every team's real record on the diagonal, and what each team's record would be if they'd played each other team's exact schedule. Green = extra wins under that schedule, red = fewer. It's the randomness of the weekly matchups, laid bare."
    />
  );

  if (!leagueId) {
    return (
      <div>
        {header}
        <Notice>League isn&apos;t configured yet.</Notice>
      </div>
    );
  }

  let seasons: { season: string; leagueId: string }[] = [];
  try {
    seasons = await getCompletedSeasons(leagueId);
  } catch {
    return (
      <div>
        {header}
        <Notice>Couldn&apos;t reach Sleeper for season data — try again shortly.</Notice>
      </div>
    );
  }

  if (seasons.length === 0) {
    return (
      <div>
        {header}
        <Notice>No completed seasons yet.</Notice>
      </div>
    );
  }

  const selected =
    seasons.find((s) => s.season === season) ?? seasons[0];

  let data;
  try {
    data = await getScheduleLuck(selected.leagueId);
  } catch {
    return (
      <div>
        {header}
        <Notice>Couldn&apos;t load {selected.season} results from Sleeper — try again shortly.</Notice>
      </div>
    );
  }

  return (
    <div>
      {header}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted">Season</span>
        {seasons.map((s) => {
          const active = s.season === selected.season;
          return (
            <Link
              key={s.season}
              href={`/schedule-luck?season=${s.season}`}
              scroll={false}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "border-brand text-brand"
                  : "border-line text-muted hover:text-ink"
              }`}
            >
              {s.season}
            </Link>
          );
        })}
      </div>

      <ScheduleLuckMatrix data={data} />

      <p className="mt-4 max-w-3xl text-xs text-muted">
        Read a row across: each cell is that team playing the column team&apos;s
        schedule, showing the hypothetical record and the change in wins. The{" "}
        <span className="text-gold">Luck</span>{" "}column is real wins minus the
        average wins across every other team&apos;s schedule — a positive number
        means a softer-than-average schedule. Regular season only (
        {data.regularSeasonWeeks} weeks), scores from Sleeper.
      </p>
    </div>
  );
}
