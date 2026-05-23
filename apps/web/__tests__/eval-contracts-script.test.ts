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

  it("passes against the current eval library", () => {
    const output = execFileSync(process.execPath, [scriptPath], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(output).toContain("[eval-contracts] OK");
  });
});
