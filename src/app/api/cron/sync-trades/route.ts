import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncTrades } from "@/lib/sync-trades";

// Scheduled trade sync. Hit by a GitHub Actions schedule (see
// .github/workflows/sync-trades.yml). If CRON_SECRET is set, it's required as
// a Bearer token; otherwise the route is open (the import is idempotent).
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await syncTrades(createAdminClient());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "sync failed" },
      { status: 500 }
    );
  }
}
