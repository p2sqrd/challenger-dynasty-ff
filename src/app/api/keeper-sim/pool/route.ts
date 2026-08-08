import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { computeDraftPool, type SimSelections } from "@/lib/keeper-sim";

export const maxDuration = 60;

/** Compute the draft pool + remaining budgets for a set of simulated keepers. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ error: "Not linked to a manager" }, { status: 401 });
  }

  const { selections } = (await request.json().catch(() => ({}))) as {
    selections?: SimSelections;
  };
  if (!selections || typeof selections !== "object") {
    return NextResponse.json({ error: "Missing selections." }, { status: 400 });
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("id, year, starting_budget")
    .eq("status", "active")
    .maybeSingle();
  if (!season) {
    return NextResponse.json({ error: "No active season." }, { status: 400 });
  }

  const result = await computeDraftPool(supabase, season, selections);
  return NextResponse.json(result);
}
