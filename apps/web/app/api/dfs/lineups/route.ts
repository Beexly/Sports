import { NextResponse } from "next/server";
import { requireEliteApiRateLimited, requireFantasyApiRateLimited } from "@/lib/api-entitlement";
import { generateLineups, type Mode } from "@/lib/fantasy/dfs-optimizer";
import { getUnifiedDfsSlate } from "@/lib/dfs/unified-slate";
import { DFS_SLATE } from "@/lib/fantasy/dfs-slate";

export const dynamic = "force-dynamic";

/** Lineups any paid fantasy tier may generate; above this is the Elite multi-lineup tool. */
export const STANDARD_MAX_LINEUPS = 20;
export const ELITE_MAX_LINEUPS = 150;

const MODES: readonly Mode[] = ["cash", "gpp", "leverage"];

interface Body {
  mode?: unknown;
  stack?: unknown;
  locks?: unknown;
  excludes?: unknown;
  count?: unknown;
  maxExposure?: unknown;
}

function ids(value: unknown): Set<string> {
  return new Set(Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, 200) : []);
}

/**
 * Server-side lineup generation. This is where the 150-max tool is actually
 * enforced: a request for more than STANDARD_MAX_LINEUPS runs the ELITE gate,
 * so a non-Elite caller can never obtain a 21+ lineup portfolio from the
 * supported surface, whatever the client sends. Gate runs BEFORE any compute.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: "invalid_json" }, { status: 400 });
  }

  const requested = Number(body.count);
  if (!Number.isFinite(requested) || requested < 1) {
    return NextResponse.json({ success: false, error: "invalid_count" }, { status: 400 });
  }
  const count = Math.floor(requested);
  if (count > ELITE_MAX_LINEUPS) {
    return NextResponse.json(
      { success: false, error: "count_exceeds_max", max: ELITE_MAX_LINEUPS },
      { status: 400 },
    );
  }

  const denied =
    count > STANDARD_MAX_LINEUPS
      ? await requireEliteApiRateLimited("dfs/lineups-elite")
      : await requireFantasyApiRateLimited("dfs/lineups");
  if (denied) return denied;

  const mode = MODES.includes(body.mode as Mode) ? (body.mode as Mode) : "gpp";
  const exposure = Number(body.maxExposure);
  const maxExposure = Number.isFinite(exposure) ? Math.min(1, Math.max(0.05, exposure)) : 0.6;
  const slate = getUnifiedDfsSlate() ?? DFS_SLATE;

  const result = generateLineups(
    { mode, stack: body.stack !== false, locks: ids(body.locks), excludes: ids(body.excludes) },
    count,
    maxExposure,
    slate,
  );
  return NextResponse.json({ success: true, data: result, slate: slate === DFS_SLATE ? "sample" : "unified" });
}
