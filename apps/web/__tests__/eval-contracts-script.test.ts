import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "..", "..", "..");
const scriptPath = resolve(repoRoot, "scripts/eval-contracts.mjs");
const src = readFileSync(scriptPath, "utf8");
const pkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

describe("eval contract runner", () => {
  it("is wired through the root package scripts", () => {
    expect(pkg.scripts["evals:contracts"]).toBe("node scripts/eval-contracts.mjs");
    expect(pkg.scripts.guardrails).toContain("node scripts/eval-contracts.mjs");
  });

  it("validates frontmatter, required sections, and numbered pass criteria", () => {
    expect(src).toContain("REQUIRED_FRONTMATTER");
    expect(src).toContain("REQUIRED_SECTIONS");
    expect(src).toContain("# Pass criteria");
    expect(src).toContain("expected at least 3 numbered pass criteria");
  });

  it("enforces Galaxy Studio template coverage", () => {
    expect(src).toContain("REQUIRED_SURFACE_TEMPLATE_COVERAGE");
    expect(src).toContain('"galaxy-studio"');
    expect(src).toContain("FAN_EXPLAINER");
    expect(src).toContain("FANTASY_ANGLE");
    expect(src).toContain("BETTING_EDUCATION");
    expect(src).toContain("X_THREAD");
    expect(src).toContain("NEWSLETTER_BLOCK");
    expect(src).toContain("SPONSOR_SAFE_BLURB");
    expect(src).toContain("TIKTOK_REELS_SCRIPT");
    expect(src).toContain("YOUTUBE_TITLE_IDEAS");
    expect(src).toContain("missing eval coverage for template");
  });

  it("enforces calibration training scenario coverage", () => {
    expect(src).toContain("REQUIRED_SURFACE_SCENARIO_COVERAGE");
    expect(src).toContain('"calibration-training"');
    expect(src).toContain("WEEKLY_INSIGHT");
    expect(src).toContain("happy-path");
    expect(src).toContain("policy-block");
    expect(src).toContain("thin-week-fallback");
    expect(src).toContain("missing eval coverage for scenario");
  });

  it("enforces blog generation eval coverage", () => {
    expect(src).toContain('"blog-generation"');
    expect(src).toContain("BLOG_POST");
    expect(src).toContain("parse-error");
    expect(src).toContain("policy-block");
  });

  it("enforces Phase 3 distribution and review surface coverage", () => {
    expect(src).toContain('"twitter-bot"');
    expect(src).toContain("free-pick-publication");
    expect(src).toContain("paid-pick-refusal");
    expect(src).toContain('"discord-bot"');
    expect(src).toContain("pick-publication-embed");
    expect(src).toContain("unauthenticated-free-projection");
    expect(src).toContain('"model-journal"');
    expect(src).toContain("weekly-draft");
    expect(src).toContain("thin-week-honest-acknowledgment");
  });

  it("enforces Model Court and pre-mortem pipeline coverage", () => {
    expect(src).toContain('"model-court"');
    expect(src).toContain("happy-path-with-citations");
    expect(src).toContain("betting-certainty-refusal");
    expect(src).toContain("personal-advice-refusal");
    expect(src).toContain('"pre-mortem-pipeline"');
    expect(src).toContain("composer");
    expect(src).toContain("called-vs-missed");
  });

  it("passes against the current eval library", () => {
    const output = execFileSync(process.execPath, [scriptPath], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(output).toContain("[eval-contracts] OK");
  });
});
