import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import type { RankingEntry, RankingKind } from "@/types/database";

const KINDS: RankingKind[] = ["post_keeper", "post_draft"];

/**
 * Save (create or overwrite) a ranking's editable payload — the ordered
 * entries with each manager's draft needs and blurb. Author-only. Never
 * changes published state; publishing is a separate endpoint. Once a ranking
 * is already published, this quietly updates the live copy.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ error: "Not linked to a manager" }, { status: 401 });
  }
  if (!manager.is_ranking_author) {
    return NextResponse.json(
      { error: "Only ranking authors can edit rankings." },
      { status: 403 }
    );
  }

  const { kind, entries } = (await request.json().catch(() => ({}))) as {
    kind?: RankingKind;
    entries?: RankingEntry[];
  };
  if (!kind || !KINDS.includes(kind)) {
    return NextResponse.json({ error: "Unknown ranking kind." }, { status: 400 });
  }
  if (!Array.isArray(entries)) {
    return NextResponse.json({ error: "Missing entries." }, { status: 400 });
  }

  // Normalize to the stored shape — reject anything malformed rather than
  // persisting junk into the jsonb column.
  const clean: RankingEntry[] = [];
  for (const e of entries) {
    if (!e || typeof e.managerId !== "string") {
      return NextResponse.json(
        { error: "Each entry needs a managerId." },
        { status: 400 }
      );
    }
    clean.push({
      managerId: e.managerId,
      draftNeeds: Array.isArray(e.draftNeeds)
        ? e.draftNeeds.filter((n) => typeof n === "string")
        : [],
      explanation: typeof e.explanation === "string" ? e.explanation : "",
    });
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
  const { error } = await admin.from("rankings").upsert(
    {
      season_id: season.id,
      kind,
      entries: clean,
      updated_at: new Date().toISOString(),
      updated_by: manager.id,
    },
    { onConflict: "season_id,kind" }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
