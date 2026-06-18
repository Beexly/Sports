import { describe, it, expect } from "vitest";
// Pure aggregator lives as a plain .mjs lib so the same logic the CLI prints is
// the one pinned here. Imported by relative path from the repo root.
import {
  summarize,
  buildEdgeDiagnostic,
  edgeVerdict,
  BREAK_EVEN_WIN_RATE,
  MIN_CLV_SAMPLE,
  HIGH_CONFIDENCE_THRESHOLD,
} from "../../../scripts/lib/edge-diagnostic.mjs";

type Row = {
  result: string;
  tier: string | null;
  confidence: number | null;
  pickGrade: string | null;
  modelVersion: string | null;
  sport: string | null;
  clvValue: number | null;
  clvVerdict: string | null;
};

/** Normalize a partial spec into a full PickRow (undefined → null). */
function mk(spec: Partial<Row> & { result: string }): Row {
  return {
    result: spec.result,
    tier: spec.tier ?? null,
    confidence: spec.confidence ?? null,
    pickGrade: spec.pickGrade ?? null,
    modelVersion: spec.modelVersion ?? null,
    sport: spec.sport ?? null,
    clvValue: spec.clvValue ?? null,
    clvVerdict: spec.clvVerdict ?? null,
  };
}

function rows(specs: Array<Partial<Row> & { result: string }>): Row[] {
  return specs.map(mk);
}

describe("edge-diagnostic constants", () => {
  it("uses the -110 break-even and a CLV-noise floor", () => {
    expect(BREAK_EVEN_WIN_RATE).toBeCloseTo(0.524, 3);
    expect(MIN_CLV_SAMPLE).toBe(30);
    expect(HIGH_CONFIDENCE_THRESHOLD).toBe(70);
  });
});

describe("summarize", () => {
  it("counts W/L/P, excludes pushes from win rate, and aggregates CLV over graded only", () => {
    const s = summarize("x", rows([
      { result: "WIN", clvVerdict: "BEAT_CLOSE", clvValue: 0.4 },
      { result: "WIN", clvVerdict: "LOST_TO_CLOSE", clvValue: -0.2 },
      { result: "LOSS", clvVerdict: "BEAT_CLOSE", clvValue: 0.6 },
      { result: "PUSH", clvVerdict: null, clvValue: null }, // push: not in win rate, not CLV-graded
    ]));
    expect(s.n).toBe(4);
    expect([s.wins, s.losses, s.pushes]).toEqual([2, 1, 1]);
    // win rate excludes the push: 2 / (2+1)
    expect(s.winRate).toBeCloseTo(2 / 3, 5);
    // CLV graded = 3 (the non-null verdicts), 2 beats
    expect(s.clvGraded).toBe(3);
    expect(s.clvBeat).toBe(2);
    expect(s.clvLost).toBe(1);
    expect(s.clvBeatRate).toBeCloseTo(2 / 3, 5);
    expect(s.avgClv).toBeCloseTo((0.4 - 0.2 + 0.6) / 3, 5);
  });

  it("returns null rates (never 0 or NaN) for an empty / undecided segment", () => {
    const s = summarize("empty", rows([{ result: "PUSH" }]));
    expect(s.winRate).toBeNull();
    expect(s.clvBeatRate).toBeNull();
    expect(s.avgClv).toBeNull();
  });
});

describe("edgeVerdict — CLV is the signal, win rate at small N is noise", () => {
  function manyClv(beatFraction: number, n = 100): Row[] {
    const beats = Math.round(n * beatFraction);
    return Array.from({ length: n }, (_, i) =>
      mk({
        result: i % 2 === 0 ? "WIN" : "LOSS",
        clvVerdict: i < beats ? "BEAT_CLOSE" : "LOST_TO_CLOSE",
        clvValue: i < beats ? 0.5 : -0.5,
      })
    );
  }

  it("refuses to judge edge below the CLV sample floor", () => {
    const v = edgeVerdict(summarize("o", manyClv(0.9, MIN_CLV_SAMPLE - 1)));
    expect(v).toMatch(/too small/i);
  });

  it("calls a positive edge only when the close is beaten well over half the time", () => {
    expect(edgeVerdict(summarize("o", manyClv(0.6)))).toMatch(/POSITIVE CLV/);
  });

  it("calls it marginal at roughly break-even with the close", () => {
    expect(edgeVerdict(summarize("o", manyClv(0.5)))).toMatch(/MARGINAL CLV/);
  });

  it("calls it negative — a market-tracker — when it trails the close", () => {
    const v = edgeVerdict(summarize("o", manyClv(0.4)));
    expect(v).toMatch(/NEGATIVE CLV/);
    expect(v).toMatch(/market-tracking/);
  });

  it("says nothing-to-read on an empty set", () => {
    expect(edgeVerdict(summarize("o", []))).toMatch(/nothing to read/i);
  });
});

describe("buildEdgeDiagnostic — segmentation", () => {
  const sample = rows([
    { result: "WIN", tier: "PREMIUM", confidence: 78, pickGrade: "A", sport: "MLB", modelVersion: "v5.0.0", clvVerdict: "BEAT_CLOSE", clvValue: 0.3 },
    { result: "LOSS", tier: "PREMIUM", confidence: 72, pickGrade: "B", sport: "MLB", modelVersion: "v5.0.0", clvVerdict: "LOST_TO_CLOSE", clvValue: -0.1 },
    { result: "WIN", tier: "FREE", confidence: 61, pickGrade: "C", sport: "NHL", modelVersion: "v5.0.0", clvVerdict: "MATCHED_CLOSE", clvValue: 0 },
    { result: "LOSS", tier: "FREE", confidence: 55, pickGrade: "C", sport: "NHL", modelVersion: "v4.0.0", clvVerdict: "LOST_TO_CLOSE", clvValue: -0.4 },
  ]);

  it("isolates the PREMIUM (paid) subset and the high-confidence subset", () => {
    const d = buildEdgeDiagnostic(sample);
    expect(d.highlights.premium.n).toBe(2);
    expect(d.highlights.premium.label).toMatch(/PREMIUM/);
    // confidence >= 70 → the two premium rows (78, 72)
    expect(d.highlights.highConfidence.n).toBe(2);
  });

  it("groups by tier, grade, sport, and model version, sorted by size", () => {
    const d = buildEdgeDiagnostic(sample);
    expect(d.byTier.map((s) => s.label).sort()).toEqual(["FREE", "PREMIUM"]);
    expect(d.bySport.map((s) => s.label).sort()).toEqual(["MLB", "NHL"]);
    expect(d.byModelVersion.find((s) => s.label === "v5.0.0")?.n).toBe(3);
    expect(d.byModelVersion.find((s) => s.label === "v4.0.0")?.n).toBe(1);
  });

  it("produces a verdict string", () => {
    expect(typeof buildEdgeDiagnostic(sample).verdict).toBe("string");
  });
});
