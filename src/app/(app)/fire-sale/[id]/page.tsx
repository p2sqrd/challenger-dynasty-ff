import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getKeeperPrices } from "@/lib/keeper-price";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { LiveAuction } from "@/components/LiveAuction";
import { CopyLinkButton } from "@/components/CopyLinkButton";

export default async function LiveAuctionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: sale } = await supabase
    .from("fire_sales")
    .select("id, seller_id, player_id, player_name, mode")
    .eq("id", id)
    .single();

  // Only public sales have a live room; anything else goes back to the list.
  if (!sale || sale.mode !== "public") {
    redirect("/fire-sale");
  }

  const [{ data: seller }, { data: season }] = await Promise.all([
    supabase
      .from("managers")
      .select("display_name")
      .eq("id", sale.seller_id)
      .single(),
    supabase.from("seasons").select("year").eq("status", "active").single(),
  ]);

  const keeperPrice = season
    ? (await getKeeperPrices(supabase, season.year, [sale.player_id])).get(
        sale.player_id
      )
    : undefined;

  return (
    <div>
      <PageHeader
        title="Live Auction"
        subtitle="Bids update live. A bid in the final 10 seconds adds 10 more."
        right={
          <div className="flex items-center gap-3">
            <CopyLinkButton path={`/fire-sale/${sale.id}`} label="Share" />
            <Link href="/fire-sale" className="text-sm text-muted hover:text-ink">
              ← All Fire Sales
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <PlayerAvatar playerId={sale.player_id} name={sale.player_name} size={44} />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-ink">
              {sale.player_name}
            </span>
            <span
              title="What this player would cost to keep next year"
              className={`rounded px-1.5 py-0.5 text-xs ${
                keeperPrice != null ? "bg-surface text-gold" : "bg-surface text-muted"
              }`}
            >
              {keeperPrice != null ? `Keeper $${keeperPrice}` : "Keeper TBD"}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            from <Nameplate alias={seller?.display_name ?? "—"} size="sm" />
          </div>
        </div>
      </div>

      <LiveAuction saleId={sale.id} />
    </div>
  );
}
