import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import { getManagerAuctionBudget } from "@/lib/budget";
import {
  validateKeeperRoster,
  ROSTER_SIZE,
} from "@/lib/rules/budget-validation";
import type { KeeperPriceRule } from "@/types/database";

interface SelectionInput {
  playerId: string;
  playerName: string;
  previousPrice: number | null;
  newPrice: number;
  priceRule: KeeperPriceRule;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ error: "Not linked to a manager" }, { status: 401 });
  }

  const body = (await request.json()) as {
    seasonId: string;
    selections: SelectionInput[];
  };

  const admin = createAdminClient();
  const { data: season } = await admin
    .from("seasons")
    .select("*")
    .eq("id", body.seasonId)
    .eq("status", "active")
    .single();

  if (!season) {
    return NextResponse.json({ error: "Season is not open" }, { status: 400 });
  }

  const { data: alreadyApproved } = await admin
    .from("keepers")
    .select("id")
    .eq("season_id", season.id)
    .eq("manager_id", manager.id)
    .eq("status", "approved");

  if (alreadyApproved && alreadyApproved.length > 0) {
    return NextResponse.json(
      { error: "Keepers already approved for this season" },
      { status: 400 }
    );
  }

  // Server-side re-validation — never trust the client's totals.
  for (const s of body.selections) {
    if (s.priceRule === "standard_plus_3" && s.previousPrice != null) {
      if (s.newPrice !== s.previousPrice + 3) {
        return NextResponse.json(
          { error: `Invalid price for ${s.playerName}` },
          { status: 400 }
        );
      }
    }
  }

  const auctionBudget = await getManagerAuctionBudget(
    admin,
    season.id,
    manager.id,
    season.starting_budget
  );
  const totalSpend = body.selections.reduce((sum, s) => sum + s.newPrice, 0);
  const rosterCheck = validateKeeperRoster({
    startingBudget: auctionBudget,
    totalKeeperSpend: totalSpend,
    keeperCount: body.selections.length,
    rosterSize: ROSTER_SIZE,
  });

  if (!rosterCheck.ok) {
    return NextResponse.json(
      { error: rosterCheck.violations.join(" ") },
      { status: 400 }
    );
  }

  await admin
    .from("keepers")
    .delete()
    .eq("season_id", season.id)
    .eq("manager_id", manager.id)
    .eq("status", "submitted");

  if (body.selections.length > 0) {
    const { error } = await admin.from("keepers").insert(
      body.selections.map((s) => ({
        season_id: season.id,
        manager_id: manager.id,
        player_id: s.playerId,
        player_name: s.playerName,
        previous_price: s.previousPrice,
        new_price: s.newPrice,
        price_rule: s.priceRule,
        status: "submitted" as const,
      }))
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
