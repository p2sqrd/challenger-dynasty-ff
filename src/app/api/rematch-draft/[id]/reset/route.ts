import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";

/**
 * Wipe a test draft's picks so it can be run again. Test drafts only — there
 * is deliberately no way to reset the real draft through the API.
 */
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
  const { data: draft } = await admin
    .from("rematch_drafts")
    .select("id, is_test")
    .eq("id", id)
    .maybeSingle();

  if (!draft) {
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  }
  if (!draft.is_test) {
    return NextResponse.json(
      { error: "Only test drafts can be reset." },
      { status: 403 }
    );
  }

  const { error } = await admin.from("rematch_picks").delete().eq("draft_id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
