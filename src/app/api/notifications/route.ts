import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";

export const dynamic = "force-dynamic";

/** The current manager's recent notifications + unread count (for the bell). */
export async function GET() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ items: [], unread: 0 });
  }

  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, link, created_at, read_at")
    .eq("manager_id", manager.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const items = data ?? [];
  return NextResponse.json({
    items,
    unread: items.filter((n) => !n.read_at).length,
  });
}
