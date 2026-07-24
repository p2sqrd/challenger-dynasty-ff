import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface ActiveSale {
  id: string;
  player_name: string;
  mode: "private" | "public";
  deadline: string;
}

function Banner({
  href,
  accent,
  icon,
  children,
  cta,
}: {
  href: string;
  accent: string; // a --color-* token name
  icon: string;
  children: React.ReactNode;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-md border bg-surface px-4 py-3 transition-colors hover:bg-surface-2"
      style={{ borderColor: `color-mix(in srgb, var(${accent}) 55%, transparent)` }}
    >
      <span className="flex items-center gap-2.5 text-sm text-ink">
        <span aria-hidden className="text-base">
          {icon}
        </span>
        <span>{children}</span>
      </span>
      <span
        className="shrink-0 whitespace-nowrap text-sm font-semibold"
        style={{ color: `var(${accent})` }}
      >
        {cta} →
      </span>
    </Link>
  );
}

/**
 * Home-page call-outs: an ongoing Fire Sale and the open rule-proposal
 * window. Renders nothing when there's nothing to surface.
 */
export async function TopBanners() {
  const supabase = await createClient();
  const { data: season } = await supabase
    .from("seasons")
    .select("id, keeper_deadline")
    .eq("status", "active")
    .single();
  if (!season) return null;

  // Server component: "now" per request is intended.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const { data: sales } = await supabase
    .from("fire_sales")
    .select("id, player_name, mode, deadline, status")
    .eq("season_id", season.id)
    .eq("status", "active");
  const activeSales = ((sales ?? []) as ActiveSale[]).filter(
    (s) => new Date(s.deadline).getTime() > now
  );

  const proposalsOpen =
    !season.keeper_deadline ||
    new Date(season.keeper_deadline).getTime() > now;

  // One public sale → deep-link to its live room; otherwise the Fire Sale list.
  const single = activeSales.length === 1 ? activeSales[0] : null;
  const fireHref =
    single && single.mode === "public" ? `/fire-sale/${single.id}` : "/fire-sale";
  const fireCta = single?.mode === "public" ? "Join auction" : "Bid now";
  const names = activeSales.map((s) => s.player_name);
  const nameList =
    names.length <= 2
      ? names.join(" and ")
      : `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;

  return (
    <div className="mb-6 space-y-2">
      {activeSales.length > 0 && (
        <Banner href={fireHref} accent="--color-gold" icon="🔥" cta={fireCta}>
          <span className="font-medium">Fire Sale:</span>{" "}
          {activeSales.length === 1 ? (
            <>
              <span className="text-ink">{names[0]}</span> is on the block
            </>
          ) : (
            <>
              {activeSales.length} players on the block —{" "}
              <span className="text-ink">{nameList}</span>
            </>
          )}
        </Banner>
      )}

      {proposalsOpen && (
        <Banner
          href="/rule-proposals"
          accent="--color-brand"
          icon="🗳️"
          cta="Propose & vote"
        >
          Propose a 2026 rule change and vote on the league&apos;s proposals.
        </Banner>
      )}

      <Banner
        href="/assistant"
        accent="--color-approved"
        icon="✨"
        cta="Ask Miss Aje"
      >
        <span className="font-medium">New:</span> ask Miss Aje about your
        roster, trades, or the rules — if you can take the heat.
      </Banner>
    </div>
  );
}
