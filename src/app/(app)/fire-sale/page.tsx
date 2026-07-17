import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import { getManagerAuctionBudget } from "@/lib/budget";
import { getLeagueRosters } from "@/lib/sleeper/client";
import { getPlayerNames } from "@/lib/players";
import { maxBidFor } from "@/lib/fire-sale";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { FireSaleForm } from "@/components/FireSaleForm";
import { FireSaleBidForm } from "@/components/FireSaleBidForm";
import { FireSaleResolve } from "@/components/FireSaleResolve";
import { FireSaleCancelButton } from "@/components/FireSaleCancelButton";
import type { FireSaleStatus } from "@/types/database";

interface Sale {
  id: string;
  seller_id: string;
  player_id: string;
  player_name: string;
  mode: "private" | "public";
  min_bid: number;
  deadline: string;
  status: FireSaleStatus;
  winner_id: string | null;
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface p-5 text-sm text-muted">
      {children}
    </div>
  );
}

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function FireSalePage() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  const { data: season } = await supabase
    .from("seasons")
    .select("id, starting_budget")
    .eq("status", "active")
    .single();
  if (!season) {
    return (
      <div>
        <PageHeader title="Fire Sale" />
        <Notice>No active season yet.</Notice>
      </div>
    );
  }

  const admin = createAdminClient();

  const [{ data: managers }, { data: salesData }] = await Promise.all([
    supabase.from("managers").select("id, display_name"),
    supabase
      .from("fire_sales")
      .select("id, seller_id, player_id, player_name, mode, min_bid, deadline, status, winner_id")
      .eq("season_id", season.id)
      .order("created_at", { ascending: false }),
  ]);
  const nameById = new Map((managers ?? []).map((m) => [m.id, m.display_name]));
  const sales = (salesData ?? []) as Sale[];

  // Bids are sealed — read them only via the admin client, and only surface
  // them per the visibility rules below.
  const saleIds = sales.map((s) => s.id);
  const { data: allBids } = saleIds.length
    ? await admin
        .from("fire_sale_bids")
        .select("fire_sale_id, bidder_id, amount")
        .in("fire_sale_id", saleIds)
    : { data: [] };
  const bidsBySale = new Map<string, { bidder_id: string; amount: number }[]>();
  for (const b of allBids ?? []) {
    const list = bidsBySale.get(b.fire_sale_id) ?? [];
    list.push({ bidder_id: b.bidder_id, amount: b.amount });
    bidsBySale.set(b.fire_sale_id, list);
  }

  // Budgets for the viewer + every seller (for bid caps).
  const budgetIds = new Set<string>(sales.map((s) => s.seller_id));
  if (manager) budgetIds.add(manager.id);
  const budget = new Map<string, number>();
  await Promise.all(
    [...budgetIds].map(async (mid) =>
      budget.set(
        mid,
        await getManagerAuctionBudget(admin, season.id, mid, season.starting_budget)
      )
    )
  );

  // The seller's own roster, for the create form.
  let rosterPlayers: { id: string; name: string }[] = [];
  if (manager) {
    try {
      const rosters = await getLeagueRosters(process.env.SLEEPER_LEAGUE_ID!);
      const ids =
        rosters.find((r) => r.roster_id === manager.sleeper_roster_id)?.players ??
        [];
      const names = await getPlayerNames(supabase, ids);
      rosterPlayers = ids.map((id) => ({ id, name: names.get(id) ?? id }));
    } catch {
      rosterPlayers = [];
    }
  }

  // Server component: "now" per request is intended.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const active = sales.filter((s) => s.status === "active");
  const resolved = sales.filter((s) => s.status !== "active");

  return (
    <div>
      <PageHeader
        title="Fire Sale"
        subtitle="Put one of your players on the block. Managers bid auction dollars; you have the final say on the winner."
      />

      {manager && rosterPlayers.length > 0 && (
        <FireSaleForm rosterPlayers={rosterPlayers} />
      )}

      <div className="mt-8 space-y-4">
        {active.length === 0 && (
          <p className="text-sm text-muted">No Fire Sales running right now.</p>
        )}

        {active.map((sale) => {
          const isSeller = manager?.id === sale.seller_id;
          const closed = new Date(sale.deadline).getTime() <= now;
          const myBids = bidsBySale.get(sale.id) ?? [];
          const myBid = manager
            ? myBids.find((b) => b.bidder_id === manager.id)?.amount ?? null
            : null;
          const cap =
            manager && !isSeller
              ? maxBidFor({
                  bidderBudget: budget.get(manager.id) ?? season.starting_budget,
                  sellerBudget:
                    budget.get(sale.seller_id) ?? season.starting_budget,
                })
              : 0;

          return (
            <div
              key={sale.id}
              className="rounded-md border border-line bg-surface p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <PlayerAvatar
                    playerId={sale.player_id}
                    name={sale.player_name}
                    size={36}
                  />
                  <div>
                    <div className="text-sm font-medium text-ink">
                      {sale.player_name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      from
                      <Nameplate
                        alias={nameById.get(sale.seller_id) ?? "—"}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-muted">
                  <div>min ${sale.min_bid}</div>
                  <div>
                    {closed ? "bids closed" : "closes"} {when(sale.deadline)}
                  </div>
                </div>
              </div>

              <div className="mt-3 border-t border-line pt-3">
                {closed && isSeller ? (
                  <FireSaleResolve
                    saleId={sale.id}
                    bids={myBids.map((b) => ({
                      bidderId: b.bidder_id,
                      bidderName: nameById.get(b.bidder_id) ?? "—",
                      amount: b.amount,
                    }))}
                  />
                ) : closed && !isSeller ? (
                  <p className="text-sm text-muted">
                    Bidding closed — waiting on{" "}
                    {nameById.get(sale.seller_id) ?? "the seller"} to pick a
                    winner.{myBid !== null ? ` Your bid: $${myBid}.` : ""}
                  </p>
                ) : sale.mode === "public" ? (
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/fire-sale/${sale.id}`}
                      className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-[var(--color-brand-ink)]"
                    >
                      Enter live auction →
                    </Link>
                    {isSeller && <FireSaleCancelButton saleId={sale.id} />}
                  </div>
                ) : isSeller ? (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted">
                      Your Fire Sale · {myBids.length} sealed bid
                      {myBids.length === 1 ? "" : "s"} in
                    </p>
                    <FireSaleCancelButton saleId={sale.id} />
                  </div>
                ) : manager ? (
                  <FireSaleBidForm
                    saleId={sale.id}
                    minBid={sale.min_bid}
                    maxBid={cap}
                    currentBid={myBid}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {resolved.length > 0 && (
        <section className="mt-10">
          <h2 className="nameplate-type mb-3 text-lg text-ink">Recently resolved</h2>
          <ul className="divide-y divide-line rounded-md border border-line bg-surface">
            {resolved.map((sale) => {
              const winnerBid = sale.winner_id
                ? (bidsBySale.get(sale.id) ?? []).find(
                    (b) => b.bidder_id === sale.winner_id
                  )?.amount
                : null;
              return (
                <li
                  key={sale.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="text-ink">{sale.player_name}</span>
                  <span className="text-muted">
                    {sale.status === "accepted" && sale.winner_id ? (
                      <>
                        Sold to {nameById.get(sale.winner_id) ?? "—"} for $
                        {winnerBid} · sent to commissioner
                      </>
                    ) : sale.status === "rejected" ? (
                      "No sale — bids rejected"
                    ) : (
                      "Cancelled"
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
