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

  // Two identities from here on: the actor is whoever clicked, the subject is
  // the team whose turn is being filled. They're the same for everyone except
  // a manager holding can_pick_for_others, who may take the turn of whoever is
  // on the clock so a quiet week doesn't stall the board.
  const actorId = manager.id;
  const byProxy = manager.can_pick_for_others === true;
  if (!order.includes(actorId) && !byProxy) {
    return NextResponse.json(
      { error: "Your team isn't in this draft." },
      { status: 403 }
    );
  }

  const clockId = onTheClock(order, picks);
  if (clockId === null) {
    return NextResponse.json({ error: "The draft is complete." }, { status: 400 });
  }
  if (clockId !== actorId && !byProxy) {
    return NextResponse.json(
      { error: `It's ${aliasOf(clockId)}'s pick, not yours.` },
      { status: 400 }
    );
  }
  const madeForSomeoneElse = clockId !== actorId;

  if (!opponentManagerId || typeof week !== "number") {
    return NextResponse.json(
      { error: "Pick an opponent and a week." },
      { status: 400 }
    );
  }

  // Re-validate server-side — never trust the client's idea of what's legal.
  // Against the team on the clock, not the caller: on a proxy pick those
  // differ, and the pick belongs to the team either way. This is also what
  // enforces the lookahead guard: without it a third of drafts dead-end with
  // two teams unable to fill their last weeks.
  const option = legalPicks(order, picks, clockId, aliasOf).find(
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
    // The pick belongs to the team on the clock however it got made; who
    // clicked is recorded beside it, and only when that isn't them.
    picker_manager_id: clockId,
    opponent_manager_id: opponentManagerId,
    made_by_manager_id: madeForSomeoneElse ? actorId : null,
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

  const nextUp = onTheClock(order, [
    ...picks,
    {
      pickNumber: picks.length + 1,
      week,
      pickerManagerId: clockId,
      opponentManagerId,
    },
  ]);
  const link = `/rematch-draft/${id}`;
  // The board shows the matchup as the team's, so the ping credits the team.
  const took = `${aliasOf(clockId)} took ${aliasOf(
    opponentManagerId
  )} for Week ${week}.`;

  // Nobody should learn from the board that a matchup was chosen for them.
  // At a snake turn the same team picks twice in a row, so it can be both the
  // team picked for and the team next up — one notification in that case.
  if (madeForSomeoneElse) {
    const alsoNext = nextUp === clockId;
    await notifyManager(admin, clockId, {
      title: alsoNext ? "Your pick was made — you're up again" : "Your pick was made for you",
      body:
        `${aliasOf(actorId)} picked for you: ${took}` +
        (alsoNext ? " You're on the clock again." : ""),
      link,
    });
    if (alsoNext) return NextResponse.json({ ok: true });
  }

  // Put the next team on the clock.
  if (nextUp) {
    await notifyManager(admin, nextUp, {
      title: "You're on the clock",
      body: `${took} Pick your rematch.`,
      link,
    });
  }

  return NextResponse.json({ ok: true });
}
