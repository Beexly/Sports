import { describe, it, expect } from "vitest";
import {
  BIOMECH_READINESS,
  loadBiomechReadiness,
} from "./readiness";
import {
  buildOutputBehavior,
  confidenceLabel,
  NON_CONFIDENCE_TIERS,
  SIM_PRIOR_WEIGHT_CAP,
  MAX_BAND_WIDEN,
  WATCHLIST_THRESHOLD,
} from "./types";

// ─── Biomechanics readiness scaffold ─────────────────────────────────────────

describe("BIOMECH_READINESS — scaffold integrity", () => {
  it("no capability has status=live (none have cleared the rights+validation bar)", () => {
    const liveCaps = BIOMECH_READINESS.filter((c) => c.status === "live");
    expect(liveCaps).toHaveLength(0);
  });

  it("no capability with rightsCleared=false has a live status", () => {
    for (const cap of BIOMECH_READINESS) {
      if (!cap.rightsCleared) {
        expect(cap.status).not.toBe("live");
      }
    }
  });

  it("every capability has a non-empty note explaining its status", () => {
    for (const cap of BIOMECH_READINESS) {
      expect(cap.note.trim().length, `${cap.capability} has empty note`).toBeGreaterThan(0);
    }
  });

  it("excluded OpenPose is not present (non-commercial license)", () => {
    const poses = BIOMECH_READINESS.map((c) => c.capability.toLowerCase());
    expect(poses.some((s) => s.includes("openpose"))).toBe(false);
  });
});

describe("loadBiomechReadiness()", () => {
  it("liveCount is 0 (no live biomechanics claims yet)", () => {
    const report = loadBiomechReadiness();
    expect(report.liveCount).toBe(0);
  });

  it("returns the full capabilities array", () => {
    const report = loadBiomechReadiness();
    expect(report.capabilities).toHaveLength(BIOMECH_READINESS.length);
  });

  it("report note explicitly states nothing makes a public claim about a player's body", () => {
    const report = loadBiomechReadiness();
    expect(report.note).toMatch(/public claim|player/i);
  });

  it("generatedAt is a valid ISO timestamp", () => {
    const report = loadBiomechReadiness();
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── GSE output behavior contract ────────────────────────────────────────────

describe("buildOutputBehavior()", () => {
  const valid = {
    whatChanged: "QB missed practice Wednesday",
    whyItMatters: "Widens uncertainty on performance band",
    confidence: 0.55,
    whatCouldBreakTheRead: "Injury report not yet released",
    provenanceTier: "inferred" as const,
    verdict: "watchlist" as const,
  };

  it("returns a complete GseOutputBehavior for valid input", () => {
    const out = buildOutputBehavior(valid);
    expect(out).not.toBeNull();
    expect(out!.confidence).toBe(0.55);
    expect(out!.verdict).toBe("watchlist");
    expect(out!.provenanceTier).toBe("inferred");
  });

  it("clamps confidence below 0 to 0", () => {
    const out = buildOutputBehavior({ ...valid, confidence: -0.5 });
    expect(out!.confidence).toBe(0);
  });

  it("clamps confidence above 1 to 1", () => {
    const out = buildOutputBehavior({ ...valid, confidence: 1.8 });
    expect(out!.confidence).toBe(1);
  });

  it("returns null when whatChanged is blank", () => {
    expect(buildOutputBehavior({ ...valid, whatChanged: "" })).toBeNull();
    expect(buildOutputBehavior({ ...valid, whatChanged: "   " })).toBeNull();
  });

  it("returns null when whyItMatters is blank", () => {
    expect(buildOutputBehavior({ ...valid, whyItMatters: "" })).toBeNull();
  });

  it("returns null when whatCouldBreakTheRead is blank", () => {
    expect(buildOutputBehavior({ ...valid, whatCouldBreakTheRead: "" })).toBeNull();
  });

  it("returns null for non-finite confidence", () => {
    expect(buildOutputBehavior({ ...valid, confidence: NaN })).toBeNull();
    expect(buildOutputBehavior({ ...valid, confidence: Infinity })).toBeNull();
  });

  it("trims whitespace from string fields", () => {
    const out = buildOutputBehavior({ ...valid, whatChanged: "  something  " });
    expect(out!.whatChanged).toBe("something");
  });
});

// ─── confidenceLabel() ───────────────────────────────────────────────────────

describe("confidenceLabel()", () => {
  it("returns High for ≥0.8", () => {
    expect(confidenceLabel(0.8)).toBe("High");
    expect(confidenceLabel(1.0)).toBe("High");
  });

  it("returns Moderate for 0.6–0.79", () => {
    expect(confidenceLabel(0.6)).toBe("Moderate");
    expect(confidenceLabel(0.79)).toBe("Moderate");
  });

  it("returns Low for 0.4–0.59", () => {
    expect(confidenceLabel(0.4)).toBe("Low");
    expect(confidenceLabel(0.59)).toBe("Low");
  });

  it("returns Very low for <0.4", () => {
    expect(confidenceLabel(0.0)).toBe("Very low");
    expect(confidenceLabel(0.39)).toBe("Very low");
  });

  it("clamps out-of-range values", () => {
    expect(confidenceLabel(-1)).toBe("Very low");
    expect(confidenceLabel(2)).toBe("High");
  });
});

// ─── Constants ───────────────────────────────────────────────────────────────

describe("Human performance constants — trust invariants", () => {
  it("NON_CONFIDENCE_TIERS contains inferred and illustrative", () => {
    expect(NON_CONFIDENCE_TIERS).toContain("inferred");
    expect(NON_CONFIDENCE_TIERS).toContain("illustrative");
  });

  it("SIM_PRIOR_WEIGHT_CAP is at most 0.05 (simulation priors cannot dominate)", () => {
    expect(SIM_PRIOR_WEIGHT_CAP).toBeLessThanOrEqual(0.05);
    expect(SIM_PRIOR_WEIGHT_CAP).toBeGreaterThan(0);
  });

  it("MAX_BAND_WIDEN is at most 0.6", () => {
    expect(MAX_BAND_WIDEN).toBeLessThanOrEqual(0.6);
    expect(MAX_BAND_WIDEN).toBeGreaterThan(0);
  });

  it("WATCHLIST_THRESHOLD is between 0 and MAX_BAND_WIDEN", () => {
    expect(WATCHLIST_THRESHOLD).toBeGreaterThan(0);
    expect(WATCHLIST_THRESHOLD).toBeLessThan(MAX_BAND_WIDEN);
  });
});
