import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";

/** Seller pulls their Fire Sale before it's resolved. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ error: "Not linked to a manager" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: sale } = await admin
    .from("fire_sales")
    .select("id, seller_id, status")
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

  const { error } = await admin
    .from("fire_sales")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
