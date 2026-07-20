import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import { getLeagueRosters } from "@/lib/sleeper/client";
import { getPlayerNames } from "@/lib/players";
import { notifyAll } from "@/lib/notify";

export async function POST(request: Request) {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ error: "Not linked to a manager" }, { status: 401 });
  }

  const { playerId, mode, minBid, deadline } = (await request
    .json()
    .catch(() => ({}))) as {
    playerId?: string;
    mode?: string;
    minBid?: number;
    deadline?: string;
  };

  if (!playerId) {
    return NextResponse.json({ error: "Pick a player." }, { status: 400 });
  }
  const saleMode = mode === "public" ? "public" : "private";
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
  const { data: created, error } = await admin
    .from("fire_sales")
    .insert({
      season_id: season.id,
      seller_id: manager.id,
      player_id: playerId,
      player_name: playerName,
      mode: saleMode,
      min_bid: min,
      deadline: when.toISOString(),
      status: "active",
    })
    .select("id")
    .single();
  if (error || !created) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create the sale." },
      { status: 500 }
    );
  }

  await notifyAll(admin, {
    title: "New Fire Sale",
    body: `${playerName} is on the block from ${manager.display_name}.`,
    link: "/fire-sale",
    excludeManagerId: manager.id,
  });

  return NextResponse.json({ ok: true, id: created.id, mode: saleMode });
}
