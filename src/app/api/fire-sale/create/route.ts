import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import { getLeagueRosters } from "@/lib/sleeper/client";
import { getPlayerNames } from "@/lib/players";

export async function POST(request: Request) {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ error: "Not linked to a manager" }, { status: 401 });
  }

  const { playerId, minBid, deadline } = (await request
    .json()
    .catch(() => ({}))) as {
    playerId?: string;
    minBid?: number;
    deadline?: string;
  };

  if (!playerId) {
    return NextResponse.json({ error: "Pick a player." }, { status: 400 });
  }
  const min = Number.isInteger(minBid) && (minBid as number) >= 1 ? (minBid as number) : 1;
  const when = deadline ? new Date(deadline) : null;
  if (!when || Number.isNaN(when.getTime())) {
    return NextResponse.json({ error: "Pick a valid deadline." }, { status: 400 });
  }
  if (when.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "The deadline has to be in the future." },
      { status: 400 }
    );
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("status", "active")
    .single();
  if (!season) {
    return NextResponse.json({ error: "No active season." }, { status: 400 });
  }

  // The player must be on the seller's current Sleeper roster.
  const leagueId = process.env.SLEEPER_LEAGUE_ID!;
  const rosters = await getLeagueRosters(leagueId);
  const roster = rosters.find((r) => r.roster_id === manager.sleeper_roster_id);
  if (!roster?.players?.includes(playerId)) {
    return NextResponse.json(
      { error: "That player isn't on your roster." },
      { status: 400 }
    );
  }

  const names = await getPlayerNames(supabase, [playerId]);
  const playerName = names.get(playerId) ?? playerId;

  const admin = createAdminClient();
  const { error } = await admin.from("fire_sales").insert({
    season_id: season.id,
    seller_id: manager.id,
    player_id: playerId,
    player_name: playerName,
    mode: "private",
    min_bid: min,
    deadline: when.toISOString(),
    status: "active",
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
