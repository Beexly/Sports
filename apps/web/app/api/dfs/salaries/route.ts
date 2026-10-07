import { NextResponse } from "next/server";
import { requireFantasyApi } from "@/lib/api-entitlement";
import { loadDfsSalaries } from "@/lib/dfs/salaries";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  // Fantasy-suite data behind the fantasy floor (FANTASY | PRO | ELITE).
  // This raw JSON is the FULL reconciled board from paid providers, so it is
  // gated. The /fantasy/dfs page now enforces the SAME floor on its own rows:
  // it resolves getViewerEntitlements() and renders the top 24 licensed rows
  // only when canUseFantasyFull, so the page cannot serve as an ungated mirror
  // of this endpoint. (An earlier revision of this comment called the page's
  // rows a deliberate public teaser — they were in fact not gated at all, and
  // would have begun republishing licensed salaries to anonymous visitors the
  // moment a provider key was configured.)
  // Gate BEFORE the load: an unentitled caller must never trigger provider
  // fetches (denial-of-wallet).
  const denied = await requireFantasyApi();
  if (denied) return denied;
  const data = await loadDfsSalaries();
  return NextResponse.json({ success: true, data });
}
