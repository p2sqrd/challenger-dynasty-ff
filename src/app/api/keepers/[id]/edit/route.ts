import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";

/**
 * Commissioner override: correct a keeper's price (and optionally the player
 * name) after a manager has submitted it — e.g. someone keyed in the wrong
 * dollar amount. If the keeper is already approved, the matching
 * budget_ledger deduction is adjusted so the manager's balance stays correct.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  if (manager?.role !== "commissioner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { newPrice, playerName } = (await request.json().catch(() => ({}))) as {
    newPrice?: number;
    playerName?: string;
  };

  if (!Number.isInteger(newPrice) || (newPrice as number) < 0) {
    return NextResponse.json(
      { error: "newPrice must be a whole number of $0 or more" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: keeper } = await admin
    .from("keepers")
    .select("*")
    .eq("id", id)
    .in("status", ["submitted", "approved"])
    .single();

  if (!keeper) {
    return NextResponse.json(
      { error: "Keeper not found or not editable" },
      { status: 404 }
    );
  }

  const update: { new_price: number; player_name?: string } = {
    new_price: newPrice as number,
  };
  if (typeof playerName === "string" && playerName.trim()) {
    update.player_name = playerName.trim();
  }

  const { error: updateError } = await admin
    .from("keepers")
    .update(update)
    .eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Keep the ledger in sync for an already-approved keeper.
  if (keeper.status === "approved") {
    const { error: ledgerError } = await admin
      .from("budget_ledger")
      .update({ amount: -(newPrice as number) })
      .eq("source_id", id)
      .eq("reason", "keeper");
    if (ledgerError) {
      return NextResponse.json({ error: ledgerError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
