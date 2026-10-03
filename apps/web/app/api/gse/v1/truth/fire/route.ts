/**
 * POST /api/gse/v1/truth/fire — evaluate fire authority composition.
 * LIVE_BOARD defaults OFF. Never invents FIRE.
 *
 * Order: evaluateUnifiedPrefire → (caller selective) → evaluateFireAuthority.
 * Prefire refuses before selective multiprob cost when topology is held.
 * Selective multiprob result is an input (callers run applySelectiveGate
 * elsewhere — no pav/ivap rewrite).
 */
import { NextRequest, NextResponse } from "next/server";
import {
  evaluateFireAuthority,
  evaluateUnifiedPrefire,
  FIRE_DEMO_SCENARIOS,
  type FireAuthorityInput,
} from "@sports/prediction-engine";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  // Dark explainer — scenarios only, no live fire
  const demos = FIRE_DEMO_SCENARIOS.map((s) => {
    const input = s.input as FireAuthorityInput;
    const prefire = evaluateUnifiedPrefire({
      dualAsOfOk: input.dualAsOfOk,
      dualAsOfCode: input.dualAsOfCode,
      calibrationReady: input.calibrationReady,
      quoteFresh: input.quoteFresh,
      liveBoardOn: input.liveBoardOn,
    });
    return {
      id: s.id,
      label: s.label,
      prefire,
      result: evaluateFireAuthority(input),
    };
  });
  return NextResponse.json(
    {
      surface: "truth.fire_authority.v1",
      liveBoardDefault: false,
      note: "Prefire before selective. LIVE_BOARD founder-gated. Selective multiprob not recomputed here.",
      demos,
    },
    { headers: { "X-GSE-API": "stats.v1", "X-GSE-LIVE-BOARD": "off" } },
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // External GSE v1 surface — stop a single caller from looping the fire
  // authority evaluation (defense-in-depth; mirrors the consumeRateLimit call
  // pattern on the authenticated checkout / explain routes). Limit copied from
  // subscriptions/checkout (8/min is ample for a human operator console).
  const limit = consumeRateLimit("gse-v1-truth-fire", clientIp(req), 8, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }
  let body: Partial<FireAuthorityInput>;
  try {
    body = (await req.json()) as Partial<FireAuthorityInput>;
  } catch {
    return NextResponse.json({ error: "invalid JSON", code: "bad_json" }, { status: 400 });
  }

  const input: FireAuthorityInput = {
    dualAsOfOk: Boolean(body.dualAsOfOk),
    dualAsOfEdge: typeof body.dualAsOfEdge === "number" ? body.dualAsOfEdge : undefined,
    dualAsOfCode: typeof body.dualAsOfCode === "string" ? body.dualAsOfCode : undefined,
    calibrationReady: Boolean(body.calibrationReady),
    // Hard refuse inventing live board on
    liveBoardOn: Boolean(body.liveBoardOn),
    quoteFresh: body.quoteFresh !== false,
    selectiveWouldFire: Boolean(body.selectiveWouldFire),
    selectiveRefuseReason:
      typeof body.selectiveRefuseReason === "string"
        ? body.selectiveRefuseReason
        : undefined,
    edge: typeof body.edge === "number" ? body.edge : undefined,
  };

  // Prefire first — when held, selectiveWouldFire is irrelevant for fire claim
  const prefire = evaluateUnifiedPrefire({
    dualAsOfOk: input.dualAsOfOk,
    dualAsOfCode: input.dualAsOfCode,
    calibrationReady: input.calibrationReady,
    quoteFresh: input.quoteFresh,
    liveBoardOn: input.liveBoardOn,
  });

  const result = evaluateFireAuthority(input);
  return NextResponse.json(
    {
      prefire,
      ...result,
      law: {
        liveBoardDefault: false,
        pavIvapRewritten: false,
        prefireBeforeSelective: true,
        selectiveGateAuthority: "caller-supplied selectiveWouldFire",
      },
    },
    {
      status: result.fire ? 200 : 422,
      headers: {
        "X-GSE-API": "stats.v1",
        "X-GSE-LIVE-BOARD": input.liveBoardOn ? "on" : "off",
        "X-GSE-PREFIRE": prefire.proceedToSelective ? "proceed" : "held",
      },
    },
  );
}
