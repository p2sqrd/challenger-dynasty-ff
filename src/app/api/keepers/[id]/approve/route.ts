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
  const { data: keeper } = await admin
    .from("keepers")
    .select("*")
    .eq("id", id)
    .eq("status", "submitted")
    .single();

  if (!keeper) {
    return NextResponse.json(
      { error: "Keeper submission not found or already resolved" },
      { status: 404 }
    );
  }

  const { error: updateError } = await admin
    .from("keepers")
    .update({ status: "approved" })
    .eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: ledgerError } = await admin.from("budget_ledger").insert({
    season_id: keeper.season_id,
    manager_id: keeper.manager_id,
    amount: -keeper.new_price,
    reason: "keeper",
    source_id: keeper.id,
  });
  if (ledgerError) {
    return NextResponse.json({ error: ledgerError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
