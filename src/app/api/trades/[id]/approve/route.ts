import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  if (manager?.role !== "commissioner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: trade } = await admin
    .from("trades")
    .select("*")
    .eq("id", id)
    .eq("status", "pending_approval")
    .single();

  if (!trade) {
    return NextResponse.json(
      { error: "Trade not found or not awaiting approval" },
      { status: 404 }
    );
  }

  const { data: sides, error: sidesError } = await admin
    .from("trade_sides")
    .select("manager_id, cash_amount")
    .eq("trade_id", id);
  if (sidesError) {
    return NextResponse.json({ error: sidesError.message }, { status: 500 });
  }

  const { error: updateError } = await admin
    .from("trades")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const ledgerRows = (sides ?? [])
    .filter((s) => s.cash_amount)
    .map((s) => ({
      season_id: trade.season_id,
      manager_id: s.manager_id,
      amount: s.cash_amount!,
      reason: "trade" as const,
      source_id: trade.id,
    }));

  if (ledgerRows.length > 0) {
    const { error: ledgerError } = await admin
      .from("budget_ledger")
      .insert(ledgerRows);
    if (ledgerError) {
      return NextResponse.json({ error: ledgerError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
