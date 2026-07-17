import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";

/** Delete a trash-talk post. Only the author may delete their own post. */
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
  const { data: post } = await admin
    .from("trash_talk_posts")
    .select("id, manager_id, image_path")
    .eq("id", id)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.manager_id !== manager.id) {
    return NextResponse.json(
      { error: "You can only delete your own posts." },
      { status: 403 }
    );
  }

  if (post.image_path) {
    await admin.storage.from("trash-talk").remove([post.image_path]);
  }
  const { error } = await admin
    .from("trash_talk_posts")
    .delete()
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
