import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";

/** Mark the current manager as having seen the welcome walkthrough. */
export async function POST() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  await admin
    .from("managers")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", manager.id);

  return NextResponse.json({ ok: true });
}
