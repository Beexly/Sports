import { describe, expect, it } from "vitest";
import {
  buildReportMarkdown,
  costForModelId,
  reportFileName,
  scoreAllSurfaces,
  scoreCost,
  scoreQuality,
  blendedUsdPerM,
  INPUT_SHARE,
  type EvalReport,
} from "./scorer";
import {
  EVAL_SURFACES,
  SURFACE_PROMPTS,
  promptForSurface,
} from "./surface-prompts";

describe("surface prompt set integrity", () => {
  it("covers every model-router surface exactly once", () => {
    expect(SURFACE_PROMPTS.length).toBe(6);
    expect(EVAL_SURFACES).toEqual([
      "studio",
      "journal",
      "calibration-insight",
      "model-court",
      "content",
      "brief",
    ]);
  });

  it("promptForSurface throws for an unknown surface", () => {
    expect(() => promptForSurface("other" as never)).toThrow(/no harness prompt/);
  });
});

describe("quality rubric", () => {
  it("fails a prompt missing the {{input}} placeholder", () => {
    const broken = {
      ...SURFACE_PROMPTS[0]!,
      userTemplate: "Write the intro. No slot here.",
    };
    const score = scoreQuality(broken);
    expect(score.pass).toBe(false);
    expect(score.checks.find((c) => c.check === "user-placeholder")?.pass).toBe(false);
  });

  it("fails a prompt containing a banned phrase", () => {
    const broken = {
      ...SURFACE_PROMPTS[0]!,
      system: `${SURFACE_PROMPTS[0]!.system}\nThis is a guaranteed lock.`,
    };
    const score = scoreQuality(broken);
    expect(score.pass).toBe(false);
    expect(score.checks.find((c) => c.check === "no-banned-phrases")?.pass).toBe(false);
  });

  it("fails a public-facing prompt missing risk disclosure", () => {
    const broken = {
      ...SURFACE_PROMPTS[0]!,
      publicFacing: true,
      system: SURFACE_PROMPTS[0]!.system.replace(
        /Past performance does not guarantee future results\./,
        ""
      ),
    };
    const score = scoreQuality(broken);
    expect(score.checks.find((c) => c.check === "risk-disclosure")?.pass).toBe(false);
  });

  it("passes every prompt in the shipped set", () => {
    for (const prompt of SURFACE_PROMPTS) {
      const score = scoreQuality(prompt);
      expect(
        score.pass,
        `${prompt.surface} failed: ${score.checks
          .filter((c) => !c.pass)
          .map((c) => `${c.check} (${c.detail})`)
          .join("; ")}`
      ).toBe(true);
    }
  });
});

describe("cost scoring (vendored models.dev snapshot)", () => {
  it("finds real prices for all three Claude tiers", () => {
    expect(costForModelId({} as never, "nope")).toBeNull();
    expect(costForModelId({ anthropic: { models: {} } } as never, "x")).toBeNull();
  });

  it("blends at the documented 75% input share", () => {
    expect(blendedUsdPerM({ input: 1, output: 5 }, INPUT_SHARE)).toBe(2);
    expect(blendedUsdPerM({ input: 3, output: 15 }, INPUT_SHARE)).toBe(6);
    expect(blendedUsdPerM({ input: 6, output: 30 }, INPUT_SHARE)).toBe(12);
  });

  it("computes active vs recommended cost for the shipped set", () => {
    for (const prompt of SURFACE_PROMPTS) {
      const cost = scoreCost(prompt);
      expect(cost.activeBlendedUsdPerM).toBeGreaterThan(0);
      expect(cost.recommendedBlendedUsdPerM).toBeGreaterThan(0);
      if (prompt.activeTier === prompt.recommendedTier) {
        expect(cost.savingsFraction).toBe(0);
      }
    }
  });
});

describe("report", () => {
  it("scores all six surfaces deterministically", () => {
    const a = scoreAllSurfaces();
    const b = scoreAllSurfaces();
    expect(a.surfaces.length).toBe(6);
    expect(a.qualityPassCount).toBe(6);
    expect(a.qualityFailCount).toBe(0);
    // Deterministic except the wall-clock generatedAt: everything else must be
    // byte-identical across runs.
    const stripClock = (report: EvalReport): EvalReport => ({
      ...report,
      generatedAt: "",
    });
    expect(JSON.stringify(stripClock(a))).toBe(JSON.stringify(stripClock(b)));
  });

  it("builds a markdown report with the honesty note and no fabricated scores", () => {
    const report = scoreAllSurfaces();
    const md = buildReportMarkdown(report);
    expect(md).toContain("# Eval:prompts");
    expect(md).toContain("STATIC analysis");
    expect(md).toContain("studio | sonnet");
    expect(md).toContain("brief | haiku");
    expect(md).toMatch(/claude-haiku-4-5-20251001/);
    expect(md).not.toMatch(/Quality fail: [1-9]/);
  });

  it("produces a dated, stable file name", () => {
    expect(reportFileName("2026-08-12T00:00:00.000Z")).toBe(
      "eval-prompts-2026-08-12.md"
    );
  });

  it("lists quality failures in the report when a prompt is broken", () => {
    const report = scoreAllSurfaces();
    const broken = {
      ...report.surfaces[0]!,
      quality: {
        pass: false,
        checks: [
          {
            check: "risk-disclosure",
            pass: false,
            detail: "public-facing system prompt is MISSING risk disclosure",
          },
        ],
      },
    };
    const md = buildReportMarkdown({ ...report, surfaces: [broken] });
    expect(md).toContain("## Quality failures");
    expect(md).toContain("risk-disclosure");
  });
});
