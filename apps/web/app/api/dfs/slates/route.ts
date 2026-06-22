/**
 * GET /api/dfs/slates
 * Returns all DFS slates, optionally filtered by site and/or active status.
 */

import { NextResponse } from "next/server";
import { listSlates } from "@/lib/dfs/service";
import type { DfsSite } from "@sports/types";

export const dynamic = "force-dynamic";

const VALID_SITES: DfsSite[] = ["DRAFTKINGS", "FANDUEL", "YAHOO"];

export async function GET(req: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);

    const siteParam = searchParams.get("site");
    const activeParam = searchParams.get("active");

    let site: DfsSite | undefined;
    if (siteParam) {
      if (!VALID_SITES.includes(siteParam as DfsSite)) {
        return NextResponse.json(
          { error: `Invalid site "${siteParam}". Valid values: ${VALID_SITES.join(", ")}` },
          { status: 400 }
        );
      }
      site = siteParam as DfsSite;
    }

    let active: boolean | undefined;
    if (activeParam === "true") active = true;
    else if (activeParam === "false") active = false;

    const slates = await listSlates({ site, active });
    return NextResponse.json({ slates });
  } catch (err) {
    console.error("[GET /api/dfs/slates]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
