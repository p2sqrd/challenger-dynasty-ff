import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAll, notifyManager } from "@/lib/notify";
import { unvotedCountByManager } from "@/lib/keeper-gate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const THRESHOLDS = [24, 3, 1]; // hours before a deadline

function hoursText(t: number) {
  return t === 1 ? "1 hour" : `${t} hours`;
}

/**
 * Fires the 24h / 3h / 1h reminders for the keeper deadline, the draft, and
 * any active Fire Sale. Each (deadline, threshold) is sent once — deduped via
 * reminder_log. Meant to be hit every ~15 min by an external scheduler
 * (GitHub Actions), since Vercel Hobby crons only run daily.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const now = Date.now();

  const [{ data: season }, { data: sales }] = await Promise.all([
    admin
      .from("seasons")
      .select("id, keeper_deadline, draft_datetime")
      .eq("status", "active")
      .maybeSingle(),
    admin
      .from("fire_sales")
      .select("id, player_name, deadline")
      .eq("status", "active"),
  ]);

  interface Cand {
    key: string;
    title: string;
    body: string;
    link: string;
  }
  const candidates: Cand[] = [];
  const consider = (
    kind: string,
    id: string,
    deadline: string | null,
    make: (t: number) => { title: string; body: string; link: string }
  ) => {
    if (!deadline) return;
    const remaining = new Date(deadline).getTime() - now;
    if (remaining <= 0) return;
    for (const t of THRESHOLDS) {
      if (remaining <= t * 3600_000) {
        candidates.push({ key: `${kind}:${id}:${t}`, ...make(t) });
      }
    }
  };

  if (season) {
    consider("keeper", season.id, season.keeper_deadline, (t) => ({
      title: "Keeper deadline soon",
      body: `Keepers lock in about ${hoursText(t)}. Lock yours in now.`,
      link: "/keepers",
    }));
    consider("draft", season.id, season.draft_datetime, (t) => ({
      title: "Draft coming up",
      body: `The draft starts in about ${hoursText(t)}.`,
      link: "/keepers",
    }));
  }
  for (const s of sales ?? []) {
    consider("firesale", s.id, s.deadline, (t) => ({
      title: "Fire Sale ending soon",
      body: `Bidding on ${s.player_name} ends in about ${hoursText(t)}.`,
      link: "/fire-sale",
    }));
  }

  let sent = 0;
  if (candidates.length > 0) {
    const { data: existing } = await admin
      .from("reminder_log")
      .select("key")
      .in(
        "key",
        candidates.map((c) => c.key)
      );
    const done = new Set((existing ?? []).map((e) => e.key));

    for (const c of candidates) {
      if (done.has(c.key)) continue;
      await notifyAll(admin, { title: c.title, body: c.body, link: c.link });
      await admin.from("reminder_log").insert({ key: c.key });
      sent++;
    }
  }

  // Keeper-vote reminders: keepers only count once you've voted on every open
  // rule proposal, so as the keeper deadline nears we personally nudge anyone
  // who still hasn't. Per-manager, deduped per manager + threshold.
  let voteSent = 0;
  if (season?.keeper_deadline) {
    const remaining = new Date(season.keeper_deadline).getTime() - now;
    const thresholds =
      remaining > 0 ? THRESHOLDS.filter((t) => remaining <= t * 3600_000) : [];
    if (thresholds.length > 0) {
      const { data: ledger } = await admin
        .from("budget_ledger")
        .select("manager_id")
        .eq("season_id", season.id);
      const activeIds = [...new Set((ledger ?? []).map((l) => l.manager_id))];
      const unvotedBy = await unvotedCountByManager(admin, season.id, activeIds);
      const laggards = activeIds.filter((id) => (unvotedBy.get(id) ?? 0) > 0);

      if (laggards.length > 0) {
        const keys = laggards.flatMap((id) =>
          thresholds.map((t) => `keepervote:${id}:${t}`)
        );
        const { data: existingVote } = await admin
          .from("reminder_log")
          .select("key")
          .in("key", keys);
        const doneVote = new Set((existingVote ?? []).map((e) => e.key));

        for (const id of laggards) {
          const n = unvotedBy.get(id) ?? 0;
          for (const t of thresholds) {
            const key = `keepervote:${id}:${t}`;
            if (doneVote.has(key)) continue;
            await notifyManager(admin, id, {
              title: "Vote now or your keepers won't count",
              body: `Keepers lock in about ${hoursText(
                t
              )} — and yours won't be accepted until you vote on ${n} open rule proposal${
                n === 1 ? "" : "s"
              }.`,
              link: "/rule-proposals",
            });
            await admin.from("reminder_log").insert({ key });
            voteSent++;
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent, voteSent });
}
