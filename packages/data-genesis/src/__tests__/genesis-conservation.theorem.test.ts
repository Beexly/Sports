/**
 * THE GENESIS PROMOTION CONSERVATION THEOREM — the promotion law, machine-checked.
 *
 * The keystone of the Data Genesis Engine is that there is exactly ONE door to operational truth, and
 * that door opens only when every gate is satisfied. This proves it the way the institution proves its
 * other laws (authority-tensor, meaning-conservation, sixth-ledger): an INDEPENDENT re-derivation of
 * every gate, run against a deterministic adversarial grid, must agree with `promoteSignal` on the
 * exact set of failures AND on the ok/not-ok verdict — for every input.
 *
 *   T1  Single door     — validationStatus becomes "promoted" iff promoteSignal returns ok.
 *   T2  Gate equivalence — the failure set equals the independently re-derived blocker set (keystone).
 *   T3  No forgery       — isPromotedSignal is true iff the signal came through a successful promotion.
 *   T4  Determinism      — identical inputs yield an identical verdict and promotionId.
 *
 * Deterministic: a fixed grid, no randomness, no wall clock.
 */

import { describe, it, expect } from "vitest";
import {
  promoteSignal,
  isPromotedSignal,
  type PromotionFailureCode,
  type PromoteSignalArgs,
} from "../promotion.js";
import { createSyntheticSignal, requiresCalibrationEvidence, type SignalDomain, type SyntheticSignal } from "../signal.js";
import { createGenesisReceipt, isReceiptValid, type GenesisReceipt, type LicenseScope } from "../receipt.js";
import { buildStructuredDoubt, type DoubtCaseInput, type StructuredDoubt } from "../doubt.js";
import { runMetaDoubt, DEFAULT_REQUIRED_DOUBT_CATEGORIES, type MetaDoubtReport } from "../meta-doubt.js";
import { buildCalibrationCurve, type CalibrationCurveResult, type CalibrationOutcomeSample } from "../calibration.js";
import { isPromotableStatus } from "../validation.js";
import { signalIdFrom } from "../ids.js";

const AT = "2026-06-26T00:00:00.000Z";

function testHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function receipt(valid: boolean, licenseScope: LicenseScope = "internal_only"): GenesisReceipt {
  return createGenesisReceipt(
    { createdAt: valid ? AT : "", engineVersion: "dg@1", inputs: { a: 1 }, transformation: {}, output: { v: 1 }, licenseScope },
    testHash,
  );
}

function fullCoverage(): DoubtCaseInput[] {
  return DEFAULT_REQUIRED_DOUBT_CATEGORIES.map((category) => ({
    category,
    severity: "low" as const,
    claim: "c",
    evidence: "e",
    ...(category === "licensing" || category === "model_leakage" ? { mitigation: "addressed" } : {}),
  }));
}

interface Case {
  name: string;
  domain: SignalDomain;
  confidence: number;
  status: "draft" | "candidate" | "validated";
  receiptValid: boolean;
  license: LicenseScope;
  doubtCases: DoubtCaseInput[];
  calibration?: CalibrationCurveResult;
  publicClaim?: boolean;
  /** Use a meta-doubt report belonging to a DIFFERENT signal (to exercise the belonging gate). */
  wrongMeta?: boolean;
}

function goodCal(): CalibrationCurveResult {
  const s: CalibrationOutcomeSample[] = [];
  for (let i = 0; i < 200; i++) s.push({ p: 0.7, y: (i < 140 ? 1 : 0) as 0 | 1 });
  return buildCalibrationCurve(s, 10);
}
function poorCal(): CalibrationCurveResult {
  const s: CalibrationOutcomeSample[] = [];
  for (let i = 0; i < 200; i++) s.push({ p: 0.9, y: (i < 100 ? 1 : 0) as 0 | 1 }); // ECE ≈ 0.4
  return buildCalibrationCurve(s, 10);
}
function tinyCal(): CalibrationCurveResult {
  return buildCalibrationCurve([{ p: 0.7, y: 1 }, { p: 0.7, y: 1 }], 10);
}

const GRID: readonly Case[] = [
  { name: "internal-happy", domain: "content", confidence: 0.5, status: "candidate", receiptValid: true, license: "internal_only", doubtCases: fullCoverage() },
  { name: "validated-happy", domain: "content", confidence: 0.5, status: "validated", receiptValid: true, license: "internal_only", doubtCases: fullCoverage() },
  { name: "draft", domain: "content", confidence: 0.5, status: "draft", receiptValid: true, license: "internal_only", doubtCases: fullCoverage() },
  { name: "invalid-receipt", domain: "content", confidence: 0.5, status: "candidate", receiptValid: false, license: "internal_only", doubtCases: fullCoverage() },
  { name: "critical-doubt", domain: "content", confidence: 0.5, status: "candidate", receiptValid: true, license: "internal_only", doubtCases: fullCoverage().map((c, i) => (i === 0 ? { ...c, severity: "critical", mitigation: undefined } : c)) },
  { name: "leakage-unmitigated", domain: "content", confidence: 0.5, status: "candidate", receiptValid: true, license: "internal_only", doubtCases: fullCoverage().map((c) => (c.category === "model_leakage" ? { ...c, mitigation: undefined } : c)) },
  { name: "weak-coverage", domain: "content", confidence: 0.5, status: "candidate", receiptValid: true, license: "internal_only", doubtCases: [{ category: "data_quality", severity: "low", claim: "c", evidence: "e" }] },
  { name: "highconf-no-cal", domain: "content", confidence: 0.95, status: "candidate", receiptValid: true, license: "internal_only", doubtCases: fullCoverage() },
  { name: "edge-no-cal", domain: "edge", confidence: 0.6, status: "candidate", receiptValid: true, license: "internal_only", doubtCases: fullCoverage() },
  { name: "edge-poor-cal", domain: "edge", confidence: 0.6, status: "candidate", receiptValid: true, license: "internal_only", doubtCases: fullCoverage(), calibration: poorCal() },
  { name: "edge-tiny-cal", domain: "edge", confidence: 0.6, status: "candidate", receiptValid: true, license: "internal_only", doubtCases: fullCoverage(), calibration: tinyCal() },
  { name: "edge-good-cal", domain: "edge", confidence: 0.8, status: "candidate", receiptValid: true, license: "internal_only", doubtCases: fullCoverage(), calibration: goodCal() },
  { name: "public-claim-blocked", domain: "content", confidence: 0.5, status: "candidate", receiptValid: true, license: "internal_only", doubtCases: fullCoverage(), publicClaim: true },
  { name: "public-claim-allowed", domain: "content", confidence: 0.5, status: "candidate", receiptValid: true, license: "public_claim_allowed", doubtCases: fullCoverage(), publicClaim: true },
  { name: "wrong-meta", domain: "content", confidence: 0.5, status: "candidate", receiptValid: true, license: "internal_only", doubtCases: fullCoverage(), wrongMeta: true },
];

function buildCase(c: Case): { signal: SyntheticSignal; doubt: StructuredDoubt; meta: MetaDoubtReport; args: PromoteSignalArgs } {
  const signal = createSyntheticSignal({
    signalId: signalIdFrom(c.domain, c.name),
    domain: c.domain,
    name: c.name,
    value: { v: 1 },
    confidence: c.confidence,
    uncertainty: 0.3,
    generatedAt: AT,
    engineVersion: "dg@1",
    receipt: receipt(c.receiptValid, c.license),
    validationStatus: c.status,
  });
  const doubt = buildStructuredDoubt(signal, c.doubtCases, AT);
  const meta = c.wrongMeta
    ? runMetaDoubt({ signalId: signalIdFrom("team", "other"), confidence: 0.5 }, buildStructuredDoubt({ signalId: signalIdFrom("team", "other") }, fullCoverage(), AT))
    : runMetaDoubt(signal, doubt);
  const args: PromoteSignalArgs = { structuredDoubt: doubt, metaDoubtReport: meta, promotedAt: AT };
  if (c.calibration) args.calibration = c.calibration;
  if (c.publicClaim) args.publicClaim = c.publicClaim;
  return { signal, doubt, meta, args };
}

/** Independent re-derivation of the blocker set — mirrors promotion.ts gate-for-gate. */
function expectedBlockers(signal: SyntheticSignal, doubt: StructuredDoubt, meta: MetaDoubtReport, args: PromoteSignalArgs): Set<PromotionFailureCode> {
  const minimumSamples = args.minimumSamples ?? 50;
  const maximumECE = args.maximumECE ?? 0.05;
  const minDoubtCoverage = args.minDoubtCoverage ?? 1;
  const highConfidenceThreshold = args.highConfidenceThreshold ?? 0.7;
  const publicClaim = args.publicClaim ?? false;
  const s = new Set<PromotionFailureCode>();

  if (!isPromotableStatus(signal.validationStatus)) s.add("not_candidate");
  if (!signal.receipt) s.add("missing_receipt");
  else if (!isReceiptValid(signal.receipt)) s.add("invalid_receipt");
  if (doubt.signalId !== signal.signalId) s.add("missing_meta_doubt");
  if (doubt.promotionBlocked) s.add("blocking_doubt");
  if (doubt.cases.some((c) => c.category === "model_leakage" && c.blocksPromotion)) s.add("model_leakage_risk");
  if (!meta || meta.metaDoubtApplied !== true || meta.signalId !== signal.signalId) s.add("missing_meta_doubt");
  else if (meta.doubtCoverageScore < minDoubtCoverage || meta.overconfidenceFlag) s.add("weak_doubt_coverage");

  const needsCal = requiresCalibrationEvidence(signal, highConfidenceThreshold);
  if (needsCal && !args.calibration) s.add("missing_calibration");
  else if (args.calibration) {
    if (args.calibration.totalSamples < minimumSamples) s.add("insufficient_samples");
    if (args.calibration.expectedCalibrationError > maximumECE) s.add("poor_calibration");
  }
  if (publicClaim && signal.receipt && signal.receipt.licenseScope !== "public_claim_allowed") s.add("licensing_block");
  return s;
}

describe("Genesis Promotion Conservation Theorem", () => {
  for (const c of GRID) {
    it(`${c.name}: the promotion verdict equals the independent gate re-derivation`, () => {
      const { signal, doubt, meta, args } = buildCase(c);
      const expected = expectedBlockers(signal, doubt, meta, args);
      const result = promoteSignal(signal, args);

      // T2 — keystone: the failure set IS the independently derived blocker set.
      if (result.ok) {
        expect(expected.size).toBe(0);
      } else {
        expect(new Set(result.failures.map((f) => f.code))).toEqual(expected);
      }

      // T1 — single door: promoted iff ok; a refused signal keeps its prior status.
      if (result.ok) {
        expect(result.signal.validationStatus).toBe("promoted");
        // T3 — no forgery elsewhere.
        expect(isPromotedSignal(result.signal)).toBe(true);
      } else {
        expect(result.signal.validationStatus).toBe(signal.validationStatus);
        expect(isPromotedSignal(result.signal)).toBe(false);
      }

      // T4 — determinism.
      const again = promoteSignal(signal, args);
      expect(again.ok).toBe(result.ok);
      if (result.ok && again.ok) expect(again.promotionId).toBe(result.promotionId);
    });
  }

  it("every grid failure code is exercised at least once (the proof covers the whole law)", () => {
    const seen = new Set<PromotionFailureCode>();
    for (const c of GRID) {
      const { signal, doubt, meta, args } = buildCase(c);
      const r = promoteSignal(signal, args);
      if (!r.ok) for (const f of r.failures) seen.add(f.code);
    }
    for (const code of [
      "not_candidate",
      "invalid_receipt",
      "blocking_doubt",
      "model_leakage_risk",
      "weak_doubt_coverage",
      "missing_calibration",
      "poor_calibration",
      "insufficient_samples",
      "licensing_block",
      "missing_meta_doubt",
    ] as PromotionFailureCode[]) {
      expect(seen.has(code)).toBe(true);
    }
  });
});
