import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import { getManagerAuctionBudget } from "@/lib/budget";
import { KEEPER_BUDGET_FLOOR, KEEPER_BUDGET_CEIL } from "@/lib/fire-sale";

/**
 * Seller accepts a winning bid once bidding has closed. The winner must be one
 * of the highest bidders (ties are the seller's choice). We re-check the
 * $125/$275 rule against current budgets, then create a trade (player ->
 * winner, cash -> seller) in `pending_approval` for the commissioner to
 * approve — the same pipeline as any other trade.
 */
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

  const { winnerId } = (await request.json().catch(() => ({}))) as {
    winnerId?: string;
  };
  if (!winnerId) {
    return NextResponse.json({ error: "Pick a winner." }, { status: 400 });
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
  if (sale.seller_id !== manager.id) {
    return NextResponse.json({ error: "Not your Fire Sale." }, { status: 403 });
  }
  if (sale.status !== "active") {
    return NextResponse.json({ error: "Already resolved." }, { status: 400 });
  }
  if (new Date(sale.deadline).getTime() > Date.now()) {
    return NextResponse.json(
      { error: "Bidding hasn't closed yet." },
      { status: 400 }
    );
  }

  const { data: bids } = await admin
    .from("fire_sale_bids")
    .select("bidder_id, amount")
    .eq("fire_sale_id", id);
  if (!bids || bids.length === 0) {
    return NextResponse.json({ error: "There are no bids." }, { status: 400 });
  }

  const topAmount = Math.max(...bids.map((b) => b.amount));
  const winningBid = bids.find(
    (b) => b.bidder_id === winnerId && b.amount === topAmount
  );
  if (!winningBid) {
    return NextResponse.json(
      { error: "The winner must be one of the highest bidders." },
      { status: 400 }
    );
  }

  // Re-validate the budget rule against current budgets.
  const [winnerBudget, sellerBudget] = await Promise.all([
    getManagerAuctionBudget(admin, sale.season_id, winnerId, 200),
    getManagerAuctionBudget(admin, sale.season_id, sale.seller_id, 200),
  ]);
  if (winnerBudget - topAmount < KEEPER_BUDGET_FLOOR) {
    return NextResponse.json(
      { error: "That would drop the winner below $125 — their budget changed." },
      { status: 400 }
    );
  }
  if (sellerBudget + topAmount > KEEPER_BUDGET_CEIL) {
    return NextResponse.json(
      { error: "That would push you over $275 — your budget changed." },
      { status: 400 }
    );
  }

  // Create the trade: seller gives the player + gets cash; winner gets the
  // player + pays cash. Commissioner approval writes the budget ledger.
  const { data: trade, error: tradeError } = await admin
    .from("trades")
    .insert({ season_id: sale.season_id, status: "pending_approval" })
    .select("id")
    .single();
  if (tradeError) {
    return NextResponse.json({ error: tradeError.message }, { status: 500 });
  }

  const { error: sidesError } = await admin.from("trade_sides").insert([
    {
      trade_id: trade.id,
      manager_id: sale.seller_id,
      players_received: [],
      cash_amount: topAmount,
    },
    {
      trade_id: trade.id,
      manager_id: winnerId,
      players_received: [sale.player_name],
      cash_amount: -topAmount,
    },
  ]);
  if (sidesError) {
    return NextResponse.json({ error: sidesError.message }, { status: 500 });
  }

  const { error: updateError } = await admin
    .from("fire_sales")
    .update({ status: "accepted", winner_id: winnerId, trade_id: trade.id })
    .eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
