import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { getManagerAuctionBudget } from "@/lib/budget";
import { resolveTeam } from "@/lib/teams";
import { STANDINGS } from "@/lib/standings-data";
import type { VoteChoice } from "@/types/database";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { TopBanners } from "@/components/TopBanners";
import { CountdownTimers } from "@/components/CountdownTimers";

function Card({
  href,
  title,
  cta,
  children,
}: {
  href?: string;
  title: string;
  cta?: string;
  children: React.ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="nameplate-type text-sm text-ink">{title}</h2>
        {cta && href && (
          <span className="shrink-0 text-xs font-semibold text-brand">
            {cta} →
          </span>
        )}
      </div>
      <div className="mt-3 flex-1">{children}</div>
    </>
  );
  const cls =
    "flex flex-col rounded-md border border-line bg-surface p-4 transition-colors";
  return href ? (
    <Link href={href} className={`${cls} hover:bg-surface-2`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  const { data: season } = await supabase
    .from("seasons")
    .select("id, year, starting_budget, keeper_deadline, draft_datetime")
    .eq("status", "active")
    .maybeSingle();

  // Everything the cards need, loaded together.
  const [
    { data: managers },
    { data: ledger },
    { data: proposals },
    { data: votes },
    { data: sales },
    { data: myKeepers },
  ] = await Promise.all([
    supabase.from("managers").select("id, display_name"),
    season
      ? supabase.from("budget_ledger").select("manager_id").eq("season_id", season.id)
      : Promise.resolve({ data: [] as { manager_id: string }[] }),
    season
      ? supabase
          .from("rule_proposals")
          .select("id, title")
          .eq("season_id", season.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    season
      ? supabase.from("rule_proposal_votes").select("proposal_id, choice")
      : Promise.resolve({
          data: [] as { proposal_id: string; choice: VoteChoice }[],
        }),
    season
      ? supabase
          .from("fire_sales")
          .select("player_name, status, created_at")
          .eq("season_id", season.id)
          .order("created_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] as { player_name: string; status: string }[] }),
    season && manager
      ? supabase
          .from("keepers")
          .select("player_name, new_price")
          .eq("season_id", season.id)
          .eq("manager_id", manager.id)
      : Promise.resolve({ data: [] as { player_name: string; new_price: number }[] }),
  ]);

  // Current auction budgets for active managers.
  const activeIds = new Set((ledger ?? []).map((l) => l.manager_id));
  const activeManagers = (managers ?? []).filter((m) => activeIds.has(m.id));
  const budgets = season
    ? await Promise.all(
        activeManagers.map(async (m) => ({
          name: resolveTeam(m.display_name).name,
          budget: await getManagerAuctionBudget(
            supabase,
            season.id,
            m.id,
            season.starting_budget
          ),
        }))
      )
    : [];
  budgets.sort((a, b) => b.budget - a.budget);

  // Last season's (2025) finish.
  const standings2025 = STANDINGS.filter((s) => s.byYear[2025]?.w != null)
    .map((s) => ({
      name: s.name,
      w: s.byYear[2025]!.w!,
      l: s.byYear[2025]!.l!,
    }))
    .sort((a, b) => b.w - a.w || a.l - b.l);

  // Rule-proposal yes/no tallies.
  const tally = new Map<string, { yes: number; no: number; abstain: number }>();
  for (const v of votes ?? []) {
    const t = tally.get(v.proposal_id) ?? { yes: 0, no: 0, abstain: 0 };
    if (v.choice === "yes") t.yes++;
    else if (v.choice === "no") t.no++;
    else t.abstain++;
    tally.set(v.proposal_id, t);
  }

  const kept = myKeepers ?? [];
  const keptTotal = kept.reduce((sum, k) => sum + k.new_price, 0);
  const recentSale = (sales ?? [])[0];

  return (
    <div>
      <TopBanners />

      <PageHeader
        title="Challenger Dynasty"
        subtitle={`Your ${season?.year ?? ""} season at a glance.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Standings (last season) */}
        <Card href="/standings" title="2025 Standings" cta="All-time">
          {standings2025.length === 0 ? (
            <p className="text-sm text-muted">No standings yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {standings2025.slice(0, 6).map((s, i) => (
                <li
                  key={s.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="tabular w-4 text-xs text-muted">
                      {i + 1}
                    </span>
                    <Nameplate alias={s.name} size="sm" />
                  </span>
                  <span className="tabular text-muted">
                    {s.w}-{s.l}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted">Last season&apos;s finish.</p>
        </Card>

        {/* Budgets */}
        <Card href="/budget" title="Auction Budgets" cta="Details">
          {budgets.length === 0 ? (
            <p className="text-sm text-muted">No budgets yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {budgets.map((b) => (
                <li
                  key={b.name}
                  className="flex items-center justify-between text-sm"
                >
                  <Nameplate alias={b.name} size="sm" />
                  <span className="tabular text-ink">${b.budget}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Deadlines (non-clickable) */}
        <Card title="Upcoming">
          <CountdownTimers
            compact
            timers={[
              { label: "Keeper deadline", target: season?.keeper_deadline ?? null },
              { label: "Draft day", target: season?.draft_datetime ?? null },
            ]}
          />
        </Card>

        {/* My keepers */}
        <Card href="/keepers" title="My 2026 Keepers" cta="Set keepers">
          {!manager ? (
            <p className="text-sm text-muted">
              Link your login to a manager to set keepers.
            </p>
          ) : kept.length === 0 ? (
            <p className="text-sm text-muted">
              You haven&apos;t set your keepers yet — lock them in before the
              deadline.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {kept.slice(0, 6).map((k) => (
                <li
                  key={k.player_name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-ink">{k.player_name}</span>
                  <span className="tabular text-muted">${k.new_price}</span>
                </li>
              ))}
              <li className="flex items-center justify-between border-t border-line pt-1.5 text-sm font-medium">
                <span className="text-muted">
                  {kept.length} kept
                </span>
                <span className="tabular text-ink">${keptTotal}</span>
              </li>
            </ul>
          )}
        </Card>

        {/* Rule proposals */}
        <Card href="/rule-proposals" title="Rule Proposals" cta="Vote">
          {(proposals ?? []).length === 0 ? (
            <p className="text-sm text-muted">No proposals yet.</p>
          ) : (
            <ul className="space-y-2">
              {(proposals ?? []).slice(0, 4).map((p) => {
                const t = tally.get(p.id) ?? { yes: 0, no: 0, abstain: 0 };
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {p.title}
                    </span>
                    <span className="shrink-0 tabular text-xs">
                      <span className="text-approved">✓ {t.yes}</span>{" "}
                      <span className="text-rejected">✗ {t.no}</span>
                      {t.abstain > 0 && (
                        <>
                          {" "}
                          <span className="text-pending">– {t.abstain}</span>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
              {(proposals ?? []).length > 4 && (
                <li className="text-xs text-muted">
                  +{(proposals ?? []).length - 4} more
                </li>
              )}
            </ul>
          )}
        </Card>

        {/* Fire sale */}
        <Card href="/fire-sale" title="Fire Sale" cta="Bid">
          {!recentSale ? (
            <p className="text-sm text-muted">No Fire Sales yet.</p>
          ) : (
            <p className="text-sm text-ink">
              🔥 <span className="font-medium">{recentSale.player_name}</span>
              <span className="text-muted">
                {" "}
                — {recentSale.status === "active" ? "on the block now" : recentSale.status}
              </span>
            </p>
          )}
        </Card>

        {/* Process trade */}
        <Card href="/trades" title="Trades" cta="Process">
          <p className="text-sm text-muted">
            Enter cash on a Sleeper trade and send it to the commissioner.
          </p>
        </Card>

        {/* Ask Miss Aje */}
        <Card href="/assistant" title="Ask Miss Aje" cta="Ask">
          <p className="text-sm text-muted">
            Questions about your roster, trades, or the rules — if you can take
            the heat.
          </p>
        </Card>
      </div>
    </div>
  );
}
