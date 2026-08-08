import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import type { SimSelections } from "@/lib/keeper-sim";

/** List the current manager's saved simulations for the active season. */
export async function GET() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ error: "Not linked to a manager" }, { status: 401 });
  }
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("status", "active")
    .maybeSingle();
  if (!season) return NextResponse.json({ sims: [] });

  const admin = createAdminClient();
  const { data } = await admin
    .from("keeper_simulations")
    .select("id, name, selections, updated_at")
    .eq("manager_id", manager.id)
    .eq("season_id", season.id)
    .order("updated_at", { ascending: false });
  // On any error (e.g. the table not migrated yet) just return an empty list.
  return NextResponse.json({ sims: data ?? [] });
}

/** Save (or overwrite by name) a simulation for the current manager. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ error: "Not linked to a manager" }, { status: 401 });
  }

  const { name, selections } = (await request.json().catch(() => ({}))) as {
    name?: string;
    selections?: SimSelections;
  };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name your simulation." }, { status: 400 });
  }
  if (!selections || typeof selections !== "object") {
    return NextResponse.json({ error: "Missing selections." }, { status: 400 });
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
  const trimmed = name.trim();

  // Re-saving an existing name overwrites it, so a scenario has one entry.
  const { data: existing } = await admin
    .from("keeper_simulations")
    .select("id")
    .eq("manager_id", manager.id)
    .eq("season_id", season.id)
    .eq("name", trimmed)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("keeper_simulations")
      .update({ selections, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: existing.id });
  }

  const { data, error } = await admin
    .from("keeper_simulations")
    .insert({
      manager_id: manager.id,
      season_id: season.id,
      name: trimmed,
      selections,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
