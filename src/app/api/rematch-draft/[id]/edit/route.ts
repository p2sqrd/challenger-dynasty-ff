import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";
import { notifyManager } from "@/lib/notify";
import { REMATCH_WEEKS, validatePickSequence } from "@/lib/rematch-draft";
import { loadDraft } from "@/lib/rematch-load";

/**
 * Correct a pick that's already on the board — a commissioner-only fix for a
 * wrong or accidental pick. The picker (whoever was on the clock) is fixed; the
 * opponent and week are what get changed. The whole draft is re-validated with
 * the change applied, so an edit that would break a pick made after it — leaving
 * someone double-booked or the board unsolvable — is refused rather than saved.
 */
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
  if (manager.role !== "commissioner") {
    return NextResponse.json(
      { error: "Only a commissioner can edit picks." },
      { status: 403 }
    );
  }

  const { pickNumber, opponentManagerId, week } = (await request
    .json()
    .catch(() => ({}))) as {
    pickNumber?: number;
    opponentManagerId?: string;
    week?: number;
  };
  if (
    typeof pickNumber !== "number" ||
    !opponentManagerId ||
    typeof week !== "number"
  ) {
    return NextResponse.json(
      { error: "Pass a pickNumber, an opponent, and a week." },
      { status: 400 }
    );
  }
  if (!REMATCH_WEEKS.includes(week as (typeof REMATCH_WEEKS)[number])) {
    return NextResponse.json({ error: "Week must be 12, 13 or 14." }, { status: 400 });
  }

  const admin = createAdminClient();
  const loaded = await loadDraft(admin, id);
  if (!loaded) {
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  }
  const { order, picks, aliasOf } = loaded;

  const target = picks.find((p) => p.pickNumber === pickNumber);
  if (!target) {
    return NextResponse.json(
      { error: "That pick isn't on the board." },
      { status: 400 }
    );
  }
  if (!order.includes(opponentManagerId)) {
    return NextResponse.json(
      { error: "That opponent isn't in this draft." },
      { status: 400 }
    );
  }
  if (opponentManagerId === target.pickerManagerId) {
    return NextResponse.json(
      { error: `${aliasOf(target.pickerManagerId)} can't play themselves.` },
      { status: 400 }
    );
  }

  // No-op edit — nothing to validate or write.
  if (target.opponentManagerId === opponentManagerId && target.week === week) {
    return NextResponse.json({ ok: true });
  }

  // Re-validate the whole draft with the change folded in. The picker stays the
  // team that was on the clock; only their chosen matchup moves.
  const edited = picks.map((p) =>
    p.pickNumber === pickNumber
      ? { ...p, opponentManagerId, week }
      : p
  );
  const check = validatePickSequence(order, edited, aliasOf);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  const oldOpponentId = target.opponentManagerId;
  const { error } = await admin
    .from("rematch_picks")
    .update({ opponent_manager_id: opponentManagerId, week })
    .eq("draft_id", id)
    .eq("pick_number", pickNumber);
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "The board just moved — reload and try again." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Let the teams whose schedule changed know a correction was made: the picker
  // and both the dropped and the new opponent (deduped, minus the commish who
  // made the edit).
  const picker = target.pickerManagerId;
  const recipients = [...new Set([picker, oldOpponentId, opponentManagerId])].filter(
    (mid) => mid !== manager.id
  );
  const body =
    `The commissioner corrected a Rematch Draft pick: ${aliasOf(picker)} now ` +
    `plays ${aliasOf(opponentManagerId)} in Week ${week} ` +
    `(was ${aliasOf(oldOpponentId)}, Week ${target.week}).`;
  for (const mid of recipients) {
    await notifyManager(admin, mid, {
      title: "Rematch Draft pick corrected",
      body,
      link: `/rematch-draft/${id}`,
    });
  }

  return NextResponse.json({ ok: true });
}
