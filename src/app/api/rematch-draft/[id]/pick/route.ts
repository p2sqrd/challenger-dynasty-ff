import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import { notifyManager } from "@/lib/notify";
import { legalPicks, onTheClock } from "@/lib/rematch-draft";
import { loadDraft } from "@/lib/rematch-load";

/** Make the pick that's on the clock: one opponent, one week, both slots filled. */
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

  const { opponentManagerId, week } = (await request
    .json()
    .catch(() => ({}))) as { opponentManagerId?: string; week?: number };

  const admin = createAdminClient();
  const loaded = await loadDraft(admin, id);
  if (!loaded) {
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  }
  const { order, picks, aliasOf } = loaded;

  // You are always yourself: there is no picking on another team's behalf.
  const actorId = manager.id;
  if (!order.includes(actorId)) {
    return NextResponse.json(
      { error: "Your team isn't in this draft." },
      { status: 403 }
    );
  }

  const clockId = onTheClock(order, picks);
  if (clockId === null) {
    return NextResponse.json({ error: "The draft is complete." }, { status: 400 });
  }
  if (clockId !== actorId) {
    return NextResponse.json(
      { error: `It's ${aliasOf(clockId)}'s pick, not yours.` },
      { status: 400 }
    );
  }

  if (!opponentManagerId || typeof week !== "number") {
    return NextResponse.json(
      { error: "Pick an opponent and a week." },
      { status: 400 }
    );
  }

  // Re-validate server-side — never trust the client's idea of what's legal.
  // This is also what enforces the lookahead guard: without it a third of
  // drafts dead-end with two teams unable to fill their last weeks.
  const option = legalPicks(order, picks, actorId, aliasOf).find(
    (p) => p.opponentManagerId === opponentManagerId && p.week === week
  );
  if (!option) {
    return NextResponse.json({ error: "That isn't a valid pick." }, { status: 400 });
  }
  if (!option.ok) {
    return NextResponse.json({ error: option.reason }, { status: 400 });
  }

  // Claim turn N. `unique (draft_id, pick_number)` is the latch: if someone
  // else's pick landed between our read and this insert, we lose the race with
  // a 23505 instead of overwriting a board we validated against stale state.
  const { error } = await admin.from("rematch_picks").insert({
    draft_id: id,
    pick_number: picks.length + 1,
    week,
    picker_manager_id: actorId,
    opponent_manager_id: opponentManagerId,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Someone just picked — the board moved. Try again." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Put the next team on the clock.
  const nextUp = onTheClock(order, [
    ...picks,
    {
      pickNumber: picks.length + 1,
      week,
      pickerManagerId: actorId,
      opponentManagerId,
    },
  ]);
  if (nextUp) {
    await notifyManager(admin, nextUp, {
      title: "You're on the clock",
      body: `${aliasOf(actorId)} took ${aliasOf(
        opponentManagerId
      )} for Week ${week}. Pick your rematch.`,
      link: `/rematch-draft/${id}`,
    });
  }

  return NextResponse.json({ ok: true });
}
