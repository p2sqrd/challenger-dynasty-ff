import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";

interface SideInput {
  managerId: string;
  players: string[];
  cashAmount: number;
}

/**
 * Commissioner-authored trade: build a trade from scratch without waiting on
 * a Sleeper import. All sides and cash are entered up front, so it lands as
 * `pending_approval` and flows through the same approve → budget_ledger path
 * as a synced trade. Players are stored as free text (names), which the trade
 * views render as-is.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (manager?.role !== "commissioner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { seasonId, sides } = (await request.json().catch(() => ({}))) as {
    seasonId?: string;
    sides?: SideInput[];
  };

  if (!seasonId) {
    return NextResponse.json({ error: "seasonId is required" }, { status: 400 });
  }
  if (!Array.isArray(sides) || sides.length < 2) {
    return NextResponse.json(
      { error: "A trade needs at least two sides" },
      { status: 400 }
    );
  }

  const managerIds = sides.map((s) => s.managerId);
  if (managerIds.some((m) => !m)) {
    return NextResponse.json(
      { error: "Every side needs a manager" },
      { status: 400 }
    );
  }
  if (new Set(managerIds).size !== managerIds.length) {
    return NextResponse.json(
      { error: "Each manager can only appear once in a trade" },
      { status: 400 }
    );
  }
  for (const s of sides) {
    if (!Number.isInteger(s.cashAmount)) {
      return NextResponse.json(
        { error: "Cash amounts must be whole numbers" },
        { status: 400 }
      );
    }
  }

  const admin = createAdminClient();

  const { data: season } = await admin
    .from("seasons")
    .select("id")
    .eq("id", seasonId)
    .single();
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  const { data: trade, error: tradeError } = await admin
    .from("trades")
    .insert({ season_id: season.id, status: "pending_approval" })
    .select("id")
    .single();
  if (tradeError) {
    return NextResponse.json({ error: tradeError.message }, { status: 500 });
  }

  const { error: sidesError } = await admin.from("trade_sides").insert(
    sides.map((s) => ({
      trade_id: trade.id,
      manager_id: s.managerId,
      players_received: (s.players ?? [])
        .map((p) => p.trim())
        .filter(Boolean),
      cash_amount: s.cashAmount,
    }))
  );
  if (sidesError) {
    return NextResponse.json({ error: sidesError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
