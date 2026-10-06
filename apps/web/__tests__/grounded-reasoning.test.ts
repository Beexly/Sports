import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildReasoningContext,
  renderGroundingBlock,
  CANNOT_SAY,
  REASONING_SYSTEM_PREAMBLE,
} from "@/lib/jarvis/grounded-reasoning";

const NOW = "2026-09-27T12:00:00.000Z";

const census = {
  entries: [
    { key: "pgs.target_share", status: "measured" as const, n: 17535, coverage: 1 },
    { key: "ngs.receiving.cpoe", status: "insufficient-rows" as const, n: 0, coverage: 0 },
  ],
  anchors: {
    "pgs.target_share": { anchor: 0.2231, spread: 0.0912 },
  },
};

const calibration = {
  status: "GREEN",
  n: 630,
  brier: 0.2042,
  ece: 0.0556,
  eceDebiased: 0.0299,
  consecutiveGreen: 708,
  streakRequired: 3,
};

const ledger = { signalsRows: 0, hasWriter: false };

describe("buildReasoningContext", () => {
  it("carries only measured anchors, never a below-floor key", () => {
    const ctx = buildReasoningContext({ census, calibration, ledger, now: NOW });
    expect(ctx.anchors.map((a) => a.key)).toEqual(["pgs.target_share"]);
    expect(ctx.belowFloor).toEqual(["ngs.receiving.cpoe"]);
  });

  it("uses the injected now, never the wall clock", () => {
    const ctx = buildReasoningContext({ census, calibration, ledger, now: NOW });
    expect(ctx.generatedAt).toBe(NOW);
  });

  it("is deterministic: identical input gives identical output", () => {
    const a = buildReasoningContext({ census, calibration, ledger, now: NOW });
    const b = buildReasoningContext({ census, calibration, ledger, now: NOW });
    expect(renderGroundingBlock(a)).toBe(renderGroundingBlock(b));
  });
});

describe("renderGroundingBlock", () => {
  const block = renderGroundingBlock(buildReasoningContext({ census, calibration, ledger, now: NOW }));

  it("states the measured calibration and eligibility", () => {
    expect(block).toContain("status=GREEN");
    expect(block).toContain("brier=0.2042");
    expect(block).toContain("ece_debiased=0.0299");
  });

  it("publishes the ledger's dead-writer state rather than hiding it", () => {
    expect(block).toContain("0 rows written, writer=false");
    expect(block).toContain("LEARN-ONLY");
  });

  it("names the below-floor keys so thin evidence reads as thin", () => {
    expect(block).toContain("BELOW FLOOR");
    expect(block).toContain("ngs.receiving.cpoe");
  });

  it("carries every hard rule", () => {
    for (const rule of CANNOT_SAY) expect(block).toContain(rule);
  });

  it("says ABSENT for an unmeasured value rather than printing a number", () => {
    const withNull = renderGroundingBlock(
      buildReasoningContext({
        census: { entries: [], anchors: {} },
        calibration: { ...calibration, brier: null, ece: null, eceDebiased: null },
        ledger,
        now: NOW,
      }),
    );
    expect(withNull).toContain("brier=n/a");
    expect(withNull).toContain("no signal key has cleared the sample floor");
  });
});

describe("the module cannot ask a model for a number", () => {
  // The contract that makes this safe is STRUCTURAL, not a prompt convention:
  // there is no code path from here to an LLM that can return a probability.
  const src = readFileSync(
    resolve(__dirname, "../lib/jarvis/grounded-reasoning.ts"),
    "utf8",
  );

  it("imports no model client and makes no network call", () => {
    expect(src).not.toMatch(/callOpenAiCompat|chat\.completions|fetch\(/);
    expect(src).not.toMatch(/from "@\/lib\/claude-api/);
  });

  it("exports no prediction-shaped function", () => {
    const exported = src.match(/export (?:async )?function (\w+)/g) ?? [];
    const names = exported.map((s) => s.split(" ").pop());
    for (const n of names) {
      expect(n).not.toMatch(/predict|probability|forecast|estimate|winRate|edge/i);
    }
  });

  it("forbids rendering confidence as a win rate, in the prompt itself", () => {
    expect(REASONING_SYSTEM_PREAMBLE).toMatch(/do NOT predict/);
    expect(CANNOT_SAY.join(" ")).toMatch(/not a win rate/i);
  });
});
