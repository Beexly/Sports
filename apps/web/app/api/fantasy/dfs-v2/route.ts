/**
 * Public-by-design DFS v2 portfolio compute (waves-1-4). Stateless, deterministic
 * (seeded mulberry32), no user data, no DB reads/writes — callers supply their own
 * player pool or get the same illustrative DFS_SLATE the free /fantasy/dfs page
 * already renders. Abuse bounds: clientIp rate limit (lib/api/rate-limit.ts, the
 * parlay-mri pattern) + a hard 600-player input cap. The rate limit is a
 * recognized guard for scripts/guardrails/api-route-boundary.mjs — no baseline
 * exception is used.
 * NOTE: if this endpoint ever becomes the PAID member export API (the /fantasy/dfs
 * copy hints at that), it must gain an entitlement guard instead of a baseline entry.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, consumeRateLimit } from "@/lib/api/rate-limit";
import { optimizeDfsV2Portfolio } from "@/lib/fantasy/dfs-v2-client";

const PlayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  pos: z.enum(["QB", "RB", "WR", "TE", "DST"]),
  team: z.string().min(2),
  opp: z.string().min(2),
  salary: z.number().int().positive(),
  proj: z.number().nonnegative(),
  floor: z.number().nonnegative().default(0),
  ceiling: z.number().nonnegative().default(0),
  own: z.number().nonnegative().default(0.08),
});

const RequestSchema = z.object({
  mode: z.enum(["CLASSIC", "SHOWDOWN"]).default("CLASSIC"),
  numLineups: z.number().int().min(1).max(10).default(3),
  salaryCap: z.number().int().min(10_000).max(100_000).optional(),
  byeTeams: z.array(z.string()).default([]),
  outPlayers: z.array(z.string()).default([]),
  maxOverlap: z.number().int().min(0).max(8).optional(),
  seed: z.number().int().min(0).optional(),
  players: z.array(PlayerSchema).max(600).optional(),
});

export async function POST(request: Request) {
  const rl = consumeRateLimit("fantasy-dfs-v2", clientIp(request), 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } },
    );
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid portfolio request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await optimizeDfsV2Portfolio(parsed.data);
  if (result.lineups.length === 0) {
    return NextResponse.json(
      { error: "No feasible lineup found for the supplied filters" },
      { status: 422 },
    );
  }

  return NextResponse.json(result, { status: 200 });
}
