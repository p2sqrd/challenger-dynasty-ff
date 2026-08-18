import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import { loadDraft, toStateView } from "@/lib/rematch-load";

export const dynamic = "force-dynamic";

/**
 * Live draft board, polled by the room (~every 3s). Returns the fully-derived
 * view model — including the legal picks for whoever is on the clock — so the
 * client renders one source of truth and never computes rules itself.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const loaded = await loadDraft(admin, id);
  if (!loaded) {
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  }

  return NextResponse.json(toStateView(loaded, manager.id));
}
