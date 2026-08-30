import { NextResponse } from "next/server";
import { requireFantasyApi } from "@/lib/api-entitlement";
import { loadDfsSalaries } from "@/lib/dfs/salaries";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  // Fantasy-suite data behind the fantasy floor (FANTASY | PRO | ELITE).
  // The /fantasy/dfs page keeps its deliberate public teaser by SSR-ing
  // loadDfsSalaries() directly and rendering only the top 24 rows; this raw
  // JSON is the FULL reconciled board from paid providers, so it is gated.
  // Gate BEFORE the load: an unentitled caller must never trigger provider
  // fetches (denial-of-wallet).
  const denied = await requireFantasyApi();
  if (denied) return denied;
  const data = await loadDfsSalaries();
  return NextResponse.json({ success: true, data });
}
