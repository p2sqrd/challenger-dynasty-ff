import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";

/**
 * Commissioner override: pin a proposal's outcome ('passed' | 'failed'),
 * regardless of the vote tally or deadline, or clear it (null) to hand the
 * result back to the votes.
 */
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
  if (manager.role !== "commissioner") {
    return NextResponse.json({ error: "Commissioner only." }, { status: 403 });
  }

  const { status } = (await request.json().catch(() => ({}))) as {
    status?: string | null;
  };
  if (status !== "passed" && status !== "failed" && status !== null) {
    return NextResponse.json({ error: "Invalid override." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("rule_proposals")
    .update({ override_status: status })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
