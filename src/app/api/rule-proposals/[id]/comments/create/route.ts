import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";

/** Post a comment to a proposal's discussion. Any manager, anytime. */
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

  const { body } = (await request.json().catch(() => ({}))) as { body?: string };
  if (!body?.trim()) {
    return NextResponse.json({ error: "Write something first." }, { status: 400 });
  }

  const { data: proposal } = await supabase
    .from("rule_proposals")
    .select("id")
    .eq("id", id)
    .single();
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("rule_proposal_comments").insert({
    proposal_id: id,
    manager_id: manager.id,
    body: body.trim(),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
