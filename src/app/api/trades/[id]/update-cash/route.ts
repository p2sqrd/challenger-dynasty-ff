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

  if (manager?.role !== "commissioner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { cashAmount, faabAmount, sideManagerId } = (await request
    .json()
    .catch(() => ({}))) as {
    cashAmount?: number;
    faabAmount?: number;
    sideManagerId?: string;
  };
  if (cashAmount === undefined || !Number.isInteger(cashAmount)) {
    return NextResponse.json(
      { error: "cashAmount must be an integer" },
      { status: 400 }
    );
  }
  if (faabAmount !== undefined && !Number.isInteger(faabAmount)) {
    return NextResponse.json(
      { error: "faabAmount must be an integer" },
      { status: 400 }
    );
  }
  if (!sideManagerId) {
    return NextResponse.json(
      { error: "sideManagerId is required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: trade } = await admin
    .from("trades")
    .select("id")
    .eq("id", id)
    .eq("status", "pending_approval")
    .single();
  if (!trade) {
    return NextResponse.json(
      { error: "Trade not found or not pending approval" },
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

  const primary = (allSides ?? []).find(
    (s) => s.manager_id === sideManagerId
  );
  if (!primary) {
    return NextResponse.json(
      { error: "That manager isn't part of this trade." },
      { status: 400 }
    );
  }

  const { error: updateError } = await admin
    .from("trade_sides")
    .update({
      cash_amount: cashAmount,
      ...(faabAmount !== undefined && { faab_amount: faabAmount }),
    })
    .eq("id", primary.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if ((allSides ?? []).length === 2) {
    const otherSide = (allSides ?? []).find((s) => s.id !== primary.id);
    if (otherSide) {
      const { error: mirrorError } = await admin
        .from("trade_sides")
        .update({
          cash_amount: -cashAmount,
          ...(faabAmount !== undefined && { faab_amount: -faabAmount }),
        })
        .eq("id", otherSide.id);
      if (mirrorError) {
        return NextResponse.json(
          { error: mirrorError.message },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
