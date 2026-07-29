/**
 * POST /api/gse/v1/truth/fire — evaluate fire authority composition.
 * LIVE_BOARD defaults OFF. Never invents FIRE. Selective multiprob result
 * is an input (callers run applySelectiveGate elsewhere — no pav/ivap rewrite).
 */
import { NextRequest, NextResponse } from "next/server";
import {
  evaluateFireAuthority,
  FIRE_DEMO_SCENARIOS,
  type FireAuthorityInput,
} from "@sports/prediction-engine";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  // Dark explainer — scenarios only, no live fire
  const demos = FIRE_DEMO_SCENARIOS.map((s) => ({
    id: s.id,
    label: s.label,
    result: evaluateFireAuthority(s.input),
  }));
  return NextResponse.json(
    {
      surface: "truth.fire_authority.v1",
      liveBoardDefault: false,
      note: "Composition only. LIVE_BOARD founder-gated. Selective multiprob not recomputed here.",
      demos,
    },
    { headers: { "X-GSE-API": "stats.v1", "X-GSE-LIVE-BOARD": "off" } },
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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

  const result = evaluateFireAuthority(input);
  return NextResponse.json(
    {
      ...result,
      law: {
        liveBoardDefault: false,
        pavIvapRewritten: false,
        selectiveGateAuthority: "caller-supplied selectiveWouldFire",
      },
    },
    {
      status: result.fire ? 200 : 422,
      headers: {
        "X-GSE-API": "stats.v1",
        "X-GSE-LIVE-BOARD": input.liveBoardOn ? "on" : "off",
      },
    },
  );
}
