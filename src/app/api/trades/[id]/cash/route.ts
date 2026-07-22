import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";

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

  const { cashAmount } = (await request.json().catch(() => ({}))) as {
    cashAmount?: number;
  };
  if (cashAmount === undefined || !Number.isInteger(cashAmount)) {
    return NextResponse.json(
      { error: "cashAmount must be an integer" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: trade } = await admin
    .from("trades")
    .select("id, status")
    .eq("id", id)
    .eq("status", "pending_cash")
    .single();
  if (!trade) {
    return NextResponse.json(
      { error: "Trade not found or not awaiting cash entry" },
      { status: 404 }
    );
  }

  const { data: allSides, error: sidesError } = await admin
    .from("trade_sides")
    .select("id, manager_id")
    .eq("trade_id", id);
  if (sidesError) {
    return NextResponse.json({ error: sidesError.message }, { status: 500 });
  }
  const mySide = (allSides ?? []).find((s) => s.manager_id === manager.id);
  if (!mySide) {
    return NextResponse.json(
      { error: "You are not a party to this trade" },
      { status: 403 }
    );
  }

  // Only one manager needs to enter the cash. Record it on the submitter's
  // side, and — for a standard two-team trade — mirror it onto the other side
  // (cash is zero-sum: whoever pays, the other receives the same). Then it
  // goes straight to the commissioner; no waiting on the other manager.
  const { error: updateError } = await admin
    .from("trade_sides")
    .update({ cash_amount: cashAmount })
    .eq("id", mySide.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if ((allSides ?? []).length === 2) {
    const otherSide = allSides!.find((s) => s.manager_id !== manager.id);
    if (otherSide) {
      const { error: mirrorError } = await admin
        .from("trade_sides")
        .update({ cash_amount: -cashAmount })
        .eq("id", otherSide.id);
      if (mirrorError) {
        return NextResponse.json({ error: mirrorError.message }, { status: 500 });
      }
    }
  }

  const { error: statusError } = await admin
    .from("trades")
    .update({ status: "pending_approval" })
    .eq("id", id);
  if (statusError) {
    return NextResponse.json({ error: statusError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
