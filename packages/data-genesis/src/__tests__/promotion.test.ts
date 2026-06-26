import { describe, it, expect } from "vitest";
import {
  promoteSignal,
  isPromotedSignal,
  promotedOrNull,
  attachMetaDoubt,
  markCalibrated,
  type PromotedSignal,
  type Promotable,
  type WithMetaDoubt,
  type Calibrated,
} from "../promotion.js";
import { createSyntheticSignal, type SignalDomain, type SyntheticSignal } from "../signal.js";
import { createGenesisReceipt, type GenesisReceipt, type LicenseScope } from "../receipt.js";
import { buildStructuredDoubt, type DoubtCaseInput } from "../doubt.js";
import { runMetaDoubt, DEFAULT_REQUIRED_DOUBT_CATEGORIES } from "../meta-doubt.js";
import { buildCalibrationCurve, calibrationTagFrom, toMetaDoubtId, type CalibrationOutcomeSample } from "../index.js";
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

function makeReceipt(over: { engineVersion?: string; licenseScope?: LicenseScope } = {}): GenesisReceipt {
  return createGenesisReceipt(
    {
      createdAt: AT,
      engineVersion: over.engineVersion ?? "data-genesis@1",
      inputs: { a: 1 },
      transformation: { method: "blend" },
      output: { value: 0.6 },
      sourceKinds: ["odds"],
      sourceRefs: ["the-odds-api"],
      licenseScope: over.licenseScope ?? "internal_only",
    },
    testHash,
  );
}

function makeSignal(over: Partial<{
  domain: SignalDomain;
  confidence: number;
  status: "draft" | "candidate" | "validated";
  receipt: GenesisReceipt;
}> = {}): SyntheticSignal {
  return createSyntheticSignal({
    signalId: signalIdFrom(over.domain ?? "content", "weekly-narrative"),
    domain: over.domain ?? "content",
    name: "weekly narrative",
    value: { text: "a measured observation" },
    confidence: over.confidence ?? 0.5,
    uncertainty: 0.3,
    generatedAt: AT,
    engineVersion: "data-genesis@1",
    receipt: over.receipt ?? makeReceipt(),
    validationStatus: over.status ?? "candidate",
  });
}

function fullCoverageCases(): DoubtCaseInput[] {
  return DEFAULT_REQUIRED_DOUBT_CATEGORIES.map((category) => ({
    category,
    severity: "low" as const,
    claim: `doubt about ${category}`,
    evidence: "reviewed",
    ...(category === "licensing" || category === "model_leakage" ? { mitigation: "addressed" } : {}),
  }));
}

function goodCalibration() {
  const samples: CalibrationOutcomeSample[] = [];
  for (let i = 0; i < 200; i++) samples.push({ p: 0.7, y: (i < 140 ? 1 : 0) as 0 | 1 }); // 70% at p=0.7
  return buildCalibrationCurve(samples, 10);
}

function fullDoubtAndMeta(signal: SyntheticSignal) {
  const structuredDoubt = buildStructuredDoubt(signal, fullCoverageCases(), AT);
  const metaDoubtReport = runMetaDoubt(signal, structuredDoubt);
  return { structuredDoubt, metaDoubtReport };
}

describe("promotion law — refusals", () => {
  it("cannot promote a draft signal", () => {
    const s = makeSignal({ status: "draft" });
    const { structuredDoubt, metaDoubtReport } = fullDoubtAndMeta(s);
    const r = promoteSignal(s, { structuredDoubt, metaDoubtReport, promotedAt: AT });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failures.some((f) => f.code === "not_candidate")).toBe(true);
  });

  it("cannot promote with an invalid receipt", () => {
    const s = makeSignal({ receipt: makeReceipt({ engineVersion: "" }) }); // invalid integrity
    const { structuredDoubt, metaDoubtReport } = fullDoubtAndMeta(s);
    const r = promoteSignal(s, { structuredDoubt, metaDoubtReport, promotedAt: AT });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failures.some((f) => f.code === "invalid_receipt")).toBe(true);
  });

  it("cannot promote with an unresolved blocking (critical) doubt", () => {
    const s = makeSignal();
    const cases = fullCoverageCases();
    cases[0] = { category: "data_quality", severity: "critical", claim: "leak suspected", evidence: "e" };
    const structuredDoubt = buildStructuredDoubt(s, cases, AT);
    const metaDoubtReport = runMetaDoubt(s, structuredDoubt);
    const r = promoteSignal(s, { structuredDoubt, metaDoubtReport, promotedAt: AT });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failures.some((f) => f.code === "blocking_doubt")).toBe(true);
  });

  it("cannot promote when meta-doubt does not belong to the signal", () => {
    const s = makeSignal();
    const { structuredDoubt } = fullDoubtAndMeta(s);
    const otherSignal = makeSignal({ domain: "team" });
    const wrongMeta = runMetaDoubt(otherSignal, buildStructuredDoubt(otherSignal, fullCoverageCases(), AT));
    const r = promoteSignal(s, { structuredDoubt, metaDoubtReport: wrongMeta, promotedAt: AT });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failures.some((f) => f.code === "missing_meta_doubt")).toBe(true);
  });

  it("cannot promote with weak doubt coverage", () => {
    const s = makeSignal();
    const structuredDoubt = buildStructuredDoubt(s, [{ category: "data_quality", severity: "low", claim: "c", evidence: "e" }], AT);
    const metaDoubtReport = runMetaDoubt(s, structuredDoubt);
    const r = promoteSignal(s, { structuredDoubt, metaDoubtReport, promotedAt: AT });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failures.some((f) => f.code === "weak_doubt_coverage")).toBe(true);
  });

  it("cannot promote a high-confidence signal without calibration evidence", () => {
    const s = makeSignal({ confidence: 0.95 });
    const { structuredDoubt, metaDoubtReport } = fullDoubtAndMeta(s);
    const r = promoteSignal(s, { structuredDoubt, metaDoubtReport, promotedAt: AT });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failures.some((f) => f.code === "missing_calibration")).toBe(true);
  });

  it("cannot promote a probabilistic signal with poor calibration", () => {
    const s = makeSignal({ domain: "edge", confidence: 0.6 });
    const { structuredDoubt, metaDoubtReport } = fullDoubtAndMeta(s);
    const poor = buildCalibrationCurve(
      Array.from({ length: 200 }, (_, i) => ({ p: 0.9, y: (i < 100 ? 1 : 0) as 0 | 1 })), // 0.4 ECE
      10,
    );
    const r = promoteSignal(s, { structuredDoubt, metaDoubtReport, calibration: poor, promotedAt: AT });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failures.some((f) => f.code === "poor_calibration")).toBe(true);
  });

  it("cannot promote a probabilistic signal with insufficient samples", () => {
    const s = makeSignal({ domain: "edge", confidence: 0.6 });
    const { structuredDoubt, metaDoubtReport } = fullDoubtAndMeta(s);
    const tiny = buildCalibrationCurve([{ p: 0.7, y: 1 }, { p: 0.7, y: 1 }], 10);
    const r = promoteSignal(s, { structuredDoubt, metaDoubtReport, calibration: tiny, promotedAt: AT });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failures.some((f) => f.code === "insufficient_samples")).toBe(true);
  });

  it("cannot promote for a public claim when the license scope does not allow it", () => {
    const s = makeSignal({ domain: "content", confidence: 0.5 });
    const { structuredDoubt, metaDoubtReport } = fullDoubtAndMeta(s);
    const r = promoteSignal(s, { structuredDoubt, metaDoubtReport, promotedAt: AT, publicClaim: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failures.some((f) => f.code === "licensing_block")).toBe(true);
  });
});

describe("promotion law — the one path to promoted", () => {
  it("promotes a low-risk internal signal with valid receipt, doubt, meta-doubt", () => {
    const s = makeSignal();
    const { structuredDoubt, metaDoubtReport } = fullDoubtAndMeta(s);
    const r = promoteSignal(s, { structuredDoubt, metaDoubtReport, promotedAt: AT });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.signal.validationStatus).toBe("promoted");
      expect(r.signal.promotedAt).toBe(AT);
      expect(r.signal.metaDoubtApplied).toBe(true);
      expect(r.promotionId.startsWith("promotion:")).toBe(true);
      expect(isPromotedSignal(r.signal)).toBe(true);
    }
  });

  it("promotes a probabilistic signal once calibration clears the gates, attaching a calibration tag", () => {
    const s = makeSignal({ domain: "edge", confidence: 0.8 });
    const { structuredDoubt, metaDoubtReport } = fullDoubtAndMeta(s);
    const r = promoteSignal(s, { structuredDoubt, metaDoubtReport, calibration: goodCalibration(), promotedAt: AT });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.signal.calibrationTag).toBeDefined();
  });

  it("a candidate (not yet promoted) is not seen as promoted", () => {
    expect(isPromotedSignal(makeSignal())).toBe(false);
  });

  it("promotedOrNull returns the promoted signal on success and null on failure", () => {
    const s = makeSignal();
    const { structuredDoubt, metaDoubtReport } = fullDoubtAndMeta(s);
    expect(promotedOrNull(promoteSignal(s, { structuredDoubt, metaDoubtReport, promotedAt: AT }))).not.toBeNull();
    expect(promotedOrNull(promoteSignal(makeSignal({ status: "draft" }), { structuredDoubt, metaDoubtReport, promotedAt: AT }))).toBeNull();
  });
});

describe("type utilities — Promotable / WithMetaDoubt / Calibrated", () => {
  it("WithMetaDoubt and Calibrated wrap a value at the type and runtime level", () => {
    const withMeta: WithMetaDoubt<{ x: number }> = attachMetaDoubt({ x: 1 }, toMetaDoubtId("m"));
    expect(withMeta.metaDoubtApplied).toBe(true);
    expect(withMeta.metaId).toBe("meta:m");

    const calibrated: Calibrated<{ x: number }> = markCalibrated({ x: 1 }, calibrationTagFrom("n200"));
    expect(calibrated.isWellCalibrated).toBe(true);
    expect(calibrated.calibrationTag).toBe("calibration:n200");
  });

  it("Promotable narrows to the promoted type at compile time", () => {
    type _P = Promotable<PromotedSignal>;
    const check: _P extends PromotedSignal ? true : false = true;
    expect(check).toBe(true);
  });
});
