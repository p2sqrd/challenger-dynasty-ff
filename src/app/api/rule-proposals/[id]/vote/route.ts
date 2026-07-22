import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";

/** Cast (or change) a single Yes/No vote on a proposal, until the deadline. */
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

  const { vote } = (await request.json().catch(() => ({}))) as { vote?: boolean };
  if (typeof vote !== "boolean") {
    return NextResponse.json({ error: "Vote must be yes or no." }, { status: 400 });
  }

  const { data: proposal } = await supabase
    .from("rule_proposals")
    .select("id, season_id")
    .eq("id", id)
    .single();
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("keeper_deadline")
    .eq("id", proposal.season_id)
    .single();
  if (
    season?.keeper_deadline &&
    new Date(season.keeper_deadline).getTime() <= Date.now()
  ) {
    return NextResponse.json({ error: "Voting is closed." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("rule_proposal_votes").upsert(
    {
      proposal_id: id,
      manager_id: manager.id,
      vote,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "proposal_id,manager_id" }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
