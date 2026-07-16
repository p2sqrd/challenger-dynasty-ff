import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";

/** Commissioner sets the active season's keeper deadline + draft datetime. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (manager?.role !== "commissioner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    keeperDeadline?: string | null;
    draftDatetime?: string | null;
  };

  // Normalize to an ISO string or null; `undefined` signals a bad value.
  const norm = (v: unknown): string | null | undefined => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v !== "string") return undefined;
    const t = new Date(v);
    return Number.isNaN(t.getTime()) ? undefined : t.toISOString();
  };

  const keeper = norm(body.keeperDeadline);
  const draft = norm(body.draftDatetime);
  if (keeper === undefined || draft === undefined) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: season } = await admin
    .from("seasons")
    .select("id")
    .eq("status", "active")
    .single();
  if (!season) {
    return NextResponse.json({ error: "No active season." }, { status: 400 });
  }

  const { error } = await admin
    .from("seasons")
    .update({ keeper_deadline: keeper, draft_datetime: draft })
    .eq("id", season.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
