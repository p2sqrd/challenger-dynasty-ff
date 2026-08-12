import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import { notifyAll } from "@/lib/notify";
import type { RankingKind } from "@/types/database";

const KINDS: RankingKind[] = ["post_keeper", "post_draft"];

const LABEL: Record<RankingKind, string> = {
  post_keeper: "Post-Keeper Rankings",
  post_draft: "Post-Draft Rankings",
};

/**
 * Publish a ranking: flip it visible to the whole league and blast a
 * notification the first time. Author-only. Re-publishing an already-published
 * ranking refreshes it without a second notification blast (Save already
 * pushes live edits).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ error: "Not linked to a manager" }, { status: 401 });
  }
  if (!manager.is_ranking_author) {
    return NextResponse.json(
      { error: "Only ranking authors can publish rankings." },
      { status: 403 }
    );
  }

  const { kind } = (await request.json().catch(() => ({}))) as {
    kind?: RankingKind;
  };
  if (!kind || !KINDS.includes(kind)) {
    return NextResponse.json({ error: "Unknown ranking kind." }, { status: 400 });
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("status", "active")
    .maybeSingle();
  if (!season) {
    return NextResponse.json({ error: "No active season." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("rankings")
    .select("id, published")
    .eq("season_id", season.id)
    .eq("kind", kind)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json(
      { error: "Save the ranking before publishing." },
      { status: 400 }
    );
  }

  const wasPublished = existing.published;
  const { error } = await admin
    .from("rankings")
    .update({
      published: true,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: manager.id,
    })
    .eq("id", existing.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Only announce the first time it goes live — later Saves update silently.
  if (!wasPublished) {
    await notifyAll(admin, {
      title: `${LABEL[kind]} are out`,
      body: `${manager.display_name} just published the ${LABEL[
        kind
      ].toLowerCase()}. See where your team lands.`,
      link: "/rankings",
    });
  }

  return NextResponse.json({ ok: true });
}
