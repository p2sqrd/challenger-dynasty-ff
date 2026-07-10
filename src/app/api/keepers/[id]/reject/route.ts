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

  const { reason } = (await request.json().catch(() => ({}))) as {
    reason?: string;
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from("keepers")
    .update({ status: "rejected", rejection_reason: reason ?? null })
    .eq("id", id)
    .eq("status", "submitted");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
