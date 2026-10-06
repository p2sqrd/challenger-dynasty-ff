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
    .select("id")
    .eq("id", id)
    .eq("status", "approved")
    .single();

  if (!trade) {
    return NextResponse.json(
      { error: "Trade not found or not in approved state" },
      { status: 404 }
    );
  }

  const { error: ledgerError } = await admin
    .from("budget_ledger")
    .delete()
    .eq("source_id", id)
    .eq("reason", "trade");
  if (ledgerError) {
    return NextResponse.json({ error: ledgerError.message }, { status: 500 });
  }

  const { error: updateError } = await admin
    .from("trades")
    .update({ status: "pending_approval", approved_at: null })
    .eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
