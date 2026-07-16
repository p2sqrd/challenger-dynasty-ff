import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshPlayers } from "@/lib/refresh-players";

// Daily via vercel.json cron. If CRON_SECRET is set, Vercel sends it as a
// Bearer token and we require it; otherwise the route is open (the work is
// idempotent and only rewrites public Sleeper data).
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const count = await refreshPlayers(createAdminClient());
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "refresh failed" },
      { status: 500 }
    );
  }
}
