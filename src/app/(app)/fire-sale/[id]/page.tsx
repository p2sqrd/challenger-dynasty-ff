import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { LiveAuction } from "@/components/LiveAuction";

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

  const { data: seller } = await supabase
    .from("managers")
    .select("display_name")
    .eq("id", sale.seller_id)
    .single();

  return (
    <div>
      <PageHeader
        title="Live Auction"
        subtitle="Bids update live. A bid in the final 10 seconds adds 10 more."
        right={
          <Link href="/fire-sale" className="text-sm text-muted hover:text-ink">
            ← All Fire Sales
          </Link>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <PlayerAvatar playerId={sale.player_id} name={sale.player_name} size={44} />
        <div>
          <div className="text-lg font-medium text-ink">{sale.player_name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            from <Nameplate alias={seller?.display_name ?? "—"} size="sm" />
          </div>
        </div>
      </div>

      <LiveAuction saleId={sale.id} />
    </div>
  );
}
