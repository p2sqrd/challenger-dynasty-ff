import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import { REACTION_EMOJIS } from "@/lib/rule-proposals";

/** Toggle one emoji reaction on a comment for the current manager. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { commentId } = await params;
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ error: "Not linked to a manager" }, { status: 401 });
  }

  const { emoji } = (await request.json().catch(() => ({}))) as { emoji?: string };
  if (!emoji || !(REACTION_EMOJIS as readonly string[]).includes(emoji)) {
    return NextResponse.json({ error: "Unknown reaction." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("rule_proposal_comment_reactions")
    .select("comment_id")
    .eq("comment_id", commentId)
    .eq("manager_id", manager.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await admin
      .from("rule_proposal_comment_reactions")
      .delete()
      .eq("comment_id", commentId)
      .eq("manager_id", manager.id)
      .eq("emoji", emoji);
  } else {
    const { error } = await admin
      .from("rule_proposal_comment_reactions")
      .insert({ comment_id: commentId, manager_id: manager.id, emoji });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
