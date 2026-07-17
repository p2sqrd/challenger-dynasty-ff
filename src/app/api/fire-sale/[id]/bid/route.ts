import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import { getManagerAuctionBudget } from "@/lib/budget";
import { maxBidFor } from "@/lib/fire-sale";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ error: "Not linked to a manager" }, { status: 401 });
  }

  const { amount } = (await request.json().catch(() => ({}))) as {
    amount?: number;
  };
  if (!Number.isInteger(amount)) {
    return NextResponse.json({ error: "Enter a whole-dollar bid." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: sale } = await admin
    .from("fire_sales")
    .select("*")
    .eq("id", id)
    .single();
  if (!sale) {
    return NextResponse.json({ error: "Fire Sale not found." }, { status: 404 });
  }
  if (sale.seller_id === manager.id) {
    return NextResponse.json(
      { error: "You can't bid on your own player." },
      { status: 400 }
    );
  }
  if (sale.status !== "active" || new Date(sale.deadline).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Bidding has closed." }, { status: 400 });
  }

  const [bidderBudget, sellerBudget] = await Promise.all([
    getManagerAuctionBudget(admin, sale.season_id, manager.id, 200),
    getManagerAuctionBudget(admin, sale.season_id, sale.seller_id, 200),
  ]);
  const cap = maxBidFor({ bidderBudget, sellerBudget });

  if ((amount as number) < sale.min_bid) {
    return NextResponse.json(
      { error: `Bid must be at least $${sale.min_bid}.` },
      { status: 400 }
    );
  }
  if ((amount as number) > cap) {
    return NextResponse.json(
      { error: `Your max bid is $${cap} (keeps you above $125 and the seller under $275).` },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("fire_sale_bids")
    .upsert(
      { fire_sale_id: id, bidder_id: manager.id, amount: amount as number },
      { onConflict: "fire_sale_id,bidder_id" }
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
