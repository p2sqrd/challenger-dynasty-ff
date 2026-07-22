import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";

/**
 * Delete a proposal. The author or the commissioner may remove it while
 * voting is still open; once the deadline passes the record is final.
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

  const { data: proposal } = await supabase
    .from("rule_proposals")
    .select("id, author_id, season_id")
    .eq("id", id)
    .single();
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  const isCommissioner = manager.role === "commissioner";
  if (proposal.author_id !== manager.id && !isCommissioner) {
    return NextResponse.json({ error: "Not your proposal." }, { status: 403 });
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("keeper_deadline")
    .eq("id", proposal.season_id)
    .single();
  const locked =
    !!season?.keeper_deadline &&
    new Date(season.keeper_deadline).getTime() <= Date.now();
  if (locked) {
    return NextResponse.json(
      { error: "Voting has closed — this proposal is final." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("rule_proposals").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
