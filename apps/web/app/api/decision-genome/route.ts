import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminSession, ADMIN_ONLY_MESSAGE } from "@/lib/auth/require-admin";
import {
  allFixtures,
  CandidateLedger,
  evaluateAperture,
  scoreEpistemicAlpha,
  type DecisionGenome,
} from "@/lib/decision-genome";

export const dynamic = "force-dynamic";

/**
 * GET /api/decision-genome
 *
 * ADMIN-gated, read-only proof that the Decision Genome + Epistemic Alpha spine runs
 * end-to-end in the app: for each sample genome it returns the aperture verdict (with
 * reasons), the epistemic-alpha scorecard, and a candidate-denominator summary.
 *
 * Illustrative only — built from fixtures, never live picks. Nothing here publishes a
 * projection, flips a gate, or sets `priced` true. NEVER exposes secrets.
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: ADMIN_ONLY_MESSAGE }, { status: 403 });
  }

  const ledger = new CandidateLedger();
  const decisions = allFixtures.map((g: DecisionGenome) => {
    const aperture = evaluateAperture({
      market: g.market,
      evidence: g.evidence,
      model: g.model,
      compliance: g.compliance,
    });
    ledger.record({
      id: `cand-${g.id}`,
      genomeId: g.id,
      disposition: dispositionFor(g.aperture),
      aperture: g.aperture,
      reason: aperture.decidedBy,
    });
    return {
      id: g.id,
      decisionType: g.decisionType,
      aperture: { state: aperture.state, decidedBy: aperture.decidedBy, reasons: aperture.reasons, edge: aperture.edge },
      epistemicAlpha: scoreEpistemicAlpha(g),
      priced: g.proof.priced, // always false — projections stay shadow
    };
  });

  return NextResponse.json({
    success: true,
    label: "illustrative",
    data: {
      decisions,
      denominator: ledger.summary(),
      note: "Decision Genome spine — illustrative fixtures, not live picks. Projections remain shadow.",
    },
  });
}

function dispositionFor(state: DecisionGenome["aperture"]): "published" | "passed" | "suppressed" | "rejected" {
  if (state === "signal") return "published";
  if (state === "quarantine") return "suppressed";
  if (state === "pass") return "passed";
  return "rejected";
}
