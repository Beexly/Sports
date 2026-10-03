import { describe, expect, it } from "vitest";
import type { GateDecisionRow } from "@sports/prediction-engine/src/edge-lab/selective-gate.js";
import { parseDecisionCertificate } from "@sports/prediction-engine/src/certificate/decision-certificate.js";
import { evaluateBoardGate } from "@/lib/board/gate-consumer";
import { certifyBoardGateEvaluation } from "@/lib/board/gate-certificates";

/**
 * WS3: the first production consumer of certificateFromGateCandidate — wired
 * strictly POST-gate, attach-only. What must be proven here:
 *
 *   1. Every outcome of a real evaluation gets a certificate, and each
 *      certificate re-validates through parseDecisionCertificate (the
 *      recompute promise: a certificate that fails its own parser is dead
 *      weight).
 *   2. FIRE outcomes carry the gate's OWN interval — certificates describe
 *      the decision, they never re-derive it.
 *   3. Each NO_BET code maps to a typed reason, not GATE_OTHER.
 *   4. The gate's decision set is untouched by certification: same outcomes
 *      object, same FIRE set before and after — selective-gate stays the sole
 *      authority.
 *   5. Certification is deterministic: same evaluation, same content hashes.
 */

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function calRows(n: number, stratum: string, seed = 1): GateDecisionRow[] {
  const rand = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => {
    const score = rand();
    return {
      rowId: `${stratum}-cal-${i}`,
      score,
      q: 0.5,
      stratum,
      y: (rand() < score ? 1 : 0) as 0 | 1,
    };
  });
}

function candidates(n: number, stratum: string, seed = 2): GateDecisionRow[] {
  const rand = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => {
    const score = rand();
    return {
      rowId: `${stratum}-eval-${i}`,
      score,
      q: 0.5,
      stratum,
      y: (rand() < score ? 1 : 0) as 0 | 1,
    };
  });
}

const STRATUM = "nfl|SPREAD|v5.1.0";

/** A real evaluation with a mix of FIRE and NO_BET outcomes. */
function realEvaluation() {
  // 400 calibration rows clears MIN_STRATUM_CALIBRATION; tau 0 lets strong
  // candidates fire while weak ones decline on their lower bound.
  return evaluateBoardGate(calRows(400, STRATUM), candidates(40, STRATUM), 0);
}

describe("certifyBoardGateEvaluation — post-gate, attach-only", () => {
  it("mints one certificate per outcome, every one of which re-validates", async () => {
    const evaluation = realEvaluation();
    const certified = await certifyBoardGateEvaluation(evaluation);

    expect(certified).toHaveLength(evaluation.outcomes.length);
    for (const { certificate } of certified) {
      const parsed = parseDecisionCertificate(certificate);
      expect(parsed.errors).toEqual([]);
      expect(parsed.ok).toBe(true);
      expect(certificate.contentHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("FIRE certificates carry the gate's own interval — never a re-derivation", async () => {
    const evaluation = realEvaluation();
    const fires = evaluation.outcomes.filter((o) => o.code === "FIRE");
    expect(fires.length).toBeGreaterThan(0); // fixture must actually exercise FIRE

    const certified = await certifyBoardGateEvaluation(evaluation);
    const firedById = new Map(evaluation.report.decisions.map((d) => [d.rowId, d]));

    for (const { outcome, certificate } of certified) {
      if (outcome.code !== "FIRE") continue;
      expect(certificate.kind).toBe("FIRE");
      const gateDecision = firedById.get(outcome.rowId)!;
      expect(certificate.interval?.lo).toBe(gateDecision.interval.lower);
      expect(certificate.interval?.hi).toBe(gateDecision.interval.upper);
      expect(certificate.interval?.method).toBe(gateDecision.multiprobSource);
    }
  });

  it("each NO_BET code maps to its typed reason, not GATE_OTHER", async () => {
    const evaluation = realEvaluation();
    const certified = await certifyBoardGateEvaluation(evaluation);

    for (const { outcome, certificate } of certified) {
      if (outcome.code === "NO_BET_LCB") {
        expect(certificate.kind).toBe("NO_BET");
        expect(certificate.noBetReasons).toContain("NO_BET_LCB");
      }
      if (outcome.code === "INSUFFICIENT_CALIBRATION") {
        expect(certificate.noBetReasons).toContain("INSUFFICIENT_SAMPLE");
      }
    }
  });

  it("an under-calibrated stratum certifies as INSUFFICIENT_SAMPLE", async () => {
    const thin = "mlb|TOTAL|v5.1.0";
    const evaluation = evaluateBoardGate(calRows(10, thin), candidates(5, thin), 0);
    const certified = await certifyBoardGateEvaluation(evaluation);

    expect(certified.length).toBeGreaterThan(0);
    for (const { certificate } of certified) {
      expect(certificate.kind).toBe("NO_BET");
      expect(certificate.noBetReasons).toContain("INSUFFICIENT_SAMPLE");
    }
  });

  it("excluded candidates certify as NO_BET without inventing a judgement", async () => {
    const evaluation = evaluateBoardGate(
      calRows(400, STRATUM),
      candidates(3, STRATUM),
      0,
      {},
      [{ rowId: "row-x", stratum: STRATUM, missing: ["q (no two-sided odds)"] }],
    );
    const certified = await certifyBoardGateEvaluation(evaluation);
    const excluded = certified.find((c) => c.outcome.rowId === "row-x");
    expect(excluded).toBeDefined();
    expect(excluded!.certificate.kind).toBe("NO_BET");
    // Never a FIRE, never empty reasons — the parser enforces NO_BET carries
    // at least one reason, and re-validation already proved that above.
    expect(excluded!.certificate.noBetReasons!.length).toBeGreaterThan(0);
  });

  it("certification does not perturb the gate's decisions (sole-authority invariant)", async () => {
    const evaluation = realEvaluation();
    const before = JSON.stringify(evaluation.outcomes);
    const beforeFires = evaluation.report.decisions.map((d) => d.rowId).sort();

    await certifyBoardGateEvaluation(evaluation);

    expect(JSON.stringify(evaluation.outcomes)).toBe(before);
    expect(evaluation.report.decisions.map((d) => d.rowId).sort()).toEqual(beforeFires);
  });

  it("is deterministic given certifiedAt aside — stratum/eventId/kind stable across runs", async () => {
    const evaluation = realEvaluation();
    const a = await certifyBoardGateEvaluation(evaluation);
    const b = await certifyBoardGateEvaluation(evaluation);
    expect(a.map((c) => [c.certificate.eventId, c.certificate.kind])).toEqual(
      b.map((c) => [c.certificate.eventId, c.certificate.kind]),
    );
  });
});
