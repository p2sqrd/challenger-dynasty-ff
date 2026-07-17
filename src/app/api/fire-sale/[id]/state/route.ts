import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import { getManagerAuctionBudget } from "@/lib/budget";
import { maxBidFor } from "@/lib/fire-sale";

const WATCHING_WINDOW_MS = 15_000;

/**
 * Live public-auction state, polled by the auction room (~every 2s). Each call
 * also refreshes the caller's presence, so "watching now" stays current
 * without a separate heartbeat.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: sale } = await admin
    .from("fire_sales")
    .select("*")
    .eq("id", id)
    .single();
  if (!sale || sale.mode !== "public") {
    return NextResponse.json({ error: "Not a live auction." }, { status: 404 });
  }

  // Refresh this viewer's presence.
  await admin
    .from("fire_sale_presence")
    .upsert(
      { fire_sale_id: id, manager_id: manager.id, last_seen: new Date().toISOString() },
      { onConflict: "fire_sale_id,manager_id" }
    );

  const [{ data: managers }, { data: bids }, { data: presence }] =
    await Promise.all([
      admin.from("managers").select("id, display_name"),
      admin.from("fire_sale_bids").select("bidder_id, amount").eq("fire_sale_id", id),
      admin.from("fire_sale_presence").select("manager_id, last_seen").eq("fire_sale_id", id),
    ]);
  const nameById = new Map((managers ?? []).map((m) => [m.id, m.display_name]));

  let high: { amount: number; bidderName: string } | null = null;
  for (const b of bids ?? []) {
    if (!high || b.amount > high.amount) {
      high = { amount: b.amount, bidderName: nameById.get(b.bidder_id) ?? "—" };
    }
  }

  const cutoff = Date.now() - WATCHING_WINDOW_MS;
  const watching = (presence ?? [])
    .filter((p) => new Date(p.last_seen).getTime() >= cutoff)
    .map((p) => nameById.get(p.manager_id) ?? "—");

  const isSeller = manager.id === sale.seller_id;
  let myCap = 0;
  if (!isSeller) {
    const [bidderBudget, sellerBudget] = await Promise.all([
      getManagerAuctionBudget(admin, sale.season_id, manager.id, 200),
      getManagerAuctionBudget(admin, sale.season_id, sale.seller_id, 200),
    ]);
    myCap = maxBidFor({ bidderBudget, sellerBudget });
  }

  return NextResponse.json({
    status: sale.status,
    deadline: sale.deadline,
    serverNow: new Date().toISOString(),
    minBid: sale.min_bid,
    high,
    myCap,
    isSeller,
    watching,
    sellerName: nameById.get(sale.seller_id) ?? "—",
    winnerName: sale.winner_id ? nameById.get(sale.winner_id) ?? "—" : null,
  });
}
