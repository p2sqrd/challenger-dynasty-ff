import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";

/** Delete a comment. Author or commissioner only. Reactions cascade away. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { commentId } = await params;
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ error: "Not linked to a manager" }, { status: 401 });
  }

  const { data: comment } = await supabase
    .from("rule_proposal_comments")
    .select("id, manager_id")
    .eq("id", commentId)
    .single();
  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }
  if (comment.manager_id !== manager.id && manager.role !== "commissioner") {
    return NextResponse.json({ error: "Not your comment." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("rule_proposal_comments")
    .delete()
    .eq("id", commentId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
