import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";

/** Any manager can propose a 2026 rule change, until the keeper deadline. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ error: "Not linked to a manager" }, { status: 401 });
  }

  const { title, body } = (await request.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
  };
  if (!title?.trim()) {
    return NextResponse.json({ error: "Give your proposal a title." }, { status: 400 });
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("id, keeper_deadline")
    .eq("status", "active")
    .single();
  if (!season) {
    return NextResponse.json({ error: "No active season." }, { status: 400 });
  }
  if (
    season.keeper_deadline &&
    new Date(season.keeper_deadline).getTime() <= Date.now()
  ) {
    return NextResponse.json(
      { error: "Proposals are closed for this season." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("rule_proposals")
    .insert({
      season_id: season.id,
      author_id: manager.id,
      title: title.trim(),
      body: body?.trim() || null,
    })
    .select("id")
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create the proposal." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: data.id });
}
