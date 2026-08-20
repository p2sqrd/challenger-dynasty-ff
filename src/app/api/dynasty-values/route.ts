import { NextResponse } from "next/server";

const FANTASYCALC_URL =
  "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=1&numTeams=12&ppr=0.5";

export async function GET() {
  const res = await fetch(FANTASYCALC_URL, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch dynasty values from FantasyCalc" },
      { status: 502 }
    );
  }
  const data = await res.json();
  return NextResponse.json(data);
}
