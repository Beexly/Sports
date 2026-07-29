/**
 * POST /api/gse/v1/honesty/no-bet — product No-Bet codes + fire-authority composition.
 * LIVE_BOARD defaults OFF. Fire on edge, never confidence. No pav/ivap rewrite.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  evaluateFireAuthority,
  evaluateProductNoBet,
  type FireAuthorityInput,
  type ProductNoBetEvidence,
} from "@sports/prediction-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: {
    evidence?: Partial<ProductNoBetEvidence>;
    fire?: Partial<FireAuthorityInput>;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON", code: "bad_json" }, { status: 400 });
  }

  const evidence: ProductNoBetEvidence = {
    oddsAgeMs: Number(body.evidence?.oddsAgeMs ?? 0),
    maxOddsAgeMs: Number(body.evidence?.maxOddsAgeMs ?? 3_600_000),
    n: Number(body.evidence?.n ?? 0),
    nMin: Number(body.evidence?.nMin ?? 50),
    width: Number(body.evidence?.width ?? 0),
    widthMax: Number(body.evidence?.widthMax ?? 0.12),
    pLo: Number(body.evidence?.pLo ?? 0.5),
    q: Number(body.evidence?.q ?? 0.5),
    tau: Number(body.evidence?.tau ?? 0.02),
    liveBoardEnabled: Boolean(body.evidence?.liveBoardEnabled),
    missingInput: body.evidence?.missingInput ?? null,
    rightsHold: Boolean(body.evidence?.rightsHold),
  };

  const noBet = evaluateProductNoBet(evidence);

  const fireInput: FireAuthorityInput = {
    dualAsOfOk: Boolean(body.fire?.dualAsOfOk ?? true),
    dualAsOfEdge: typeof body.fire?.dualAsOfEdge === "number" ? body.fire.dualAsOfEdge : noBet.edge,
    calibrationReady: Boolean(body.fire?.calibrationReady ?? true),
    liveBoardOn: Boolean(body.fire?.liveBoardOn ?? evidence.liveBoardEnabled),
    quoteFresh: body.fire?.quoteFresh !== false,
    selectiveWouldFire: Boolean(
      body.fire?.selectiveWouldFire ?? noBet.action === "PLAY",
    ),
    selectiveRefuseReason:
      typeof body.fire?.selectiveRefuseReason === "string"
        ? body.fire.selectiveRefuseReason
        : noBet.codes[0],
    edge: typeof body.fire?.edge === "number" ? body.fire.edge : noBet.edge,
  };
  const authority = evaluateFireAuthority(fireInput);

  const publicFire = authority.fire === true && noBet.action === "PLAY";

  return NextResponse.json(
    {
      surface: "honesty.no_bet_compose.v1",
      noBet,
      authority,
      publicFire,
      law: {
        liveBoardDefault: false,
        fireOnEdgeNotConfidence: true,
        multiprobNotRewritten: true,
        publicFireRequiresAuthorityAndPlay: true,
      },
    },
    {
      status: publicFire ? 200 : 422,
      headers: {
        "X-GSE-API": "stats.v1.honesty",
        "X-GSE-LIVE-BOARD": fireInput.liveBoardOn ? "on" : "off",
        "X-GSE-PUBLIC-FIRE": publicFire ? "true" : "false",
      },
    },
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      surface: "honesty.no_bet_compose.v1",
      usage: "POST { evidence, fire? }",
      note: "Composition only. LIVE_BOARD founder-gated. Selective multiprob not recomputed.",
    },
    { headers: { "X-GSE-API": "stats.v1.honesty" } },
  );
}
