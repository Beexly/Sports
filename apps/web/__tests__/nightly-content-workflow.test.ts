import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");
const WORKFLOW = resolve(repoRoot, ".github/workflows/nightly-content.yml");
const SCRIPT = resolve(repoRoot, "scripts/draft-nightly-content.mjs");

describe(".github/workflows/nightly-content.yml — operator-approved draft pipeline", () => {
  const src = readFileSync(WORKFLOW, "utf8");

  it("runs on a daily schedule + supports manual dispatch", () => {
    expect(src).toMatch(/schedule:\s*\n\s*-\s*cron:\s*["'][^"']+["']/);
    expect(src).toMatch(/workflow_dispatch:/);
  });

  it("uses concurrency group to prevent overlapping runs", () => {
    expect(src).toMatch(/concurrency:/);
    expect(src).toMatch(/group:\s*nightly-content/);
  });

  it("uses pinned versions of standard actions", () => {
    expect(src).toMatch(/actions\/checkout@v4/);
    expect(src).toMatch(/actions\/setup-node@v4/);
    expect(src).toMatch(/peter-evans\/create-pull-request@v7/);
  });

  it("reads ANTHROPIC_API_KEY from secrets (never hardcoded)", () => {
    expect(src).toMatch(/secrets\.ANTHROPIC_API_KEY/);
    expect(src).not.toMatch(/sk-ant-/);
  });

  it("targets _drafts/ as the add-paths root", () => {
    expect(src).toMatch(/add-paths:[\s\S]*_drafts\//);
  });

  it("has NO auto-merge, NO --auto, NO direct push to main", () => {
    expect(src).not.toMatch(/auto-merge/i);
    expect(src).not.toMatch(/--auto\b/);
    expect(src).not.toMatch(/gh\s+pr\s+merge/);
    // create-pull-request handles the branch+PR push; no manual git push to main.
    expect(src).not.toMatch(/git\s+push\s+(?:[\w-]+\s+)?origin\s+main\b/);
  });

  it("declares the minimum permissions needed for the PR step", () => {
    expect(src).toMatch(/permissions:[\s\S]*contents:\s*write/);
    expect(src).toMatch(/permissions:[\s\S]*pull-requests:\s*write/);
  });

  it("references the draft script", () => {
    expect(src).toMatch(/scripts\/draft-nightly-content\.mjs/);
  });
});

describe("scripts/draft-nightly-content.mjs — draft + review runner", () => {
  const src = readFileSync(SCRIPT, "utf8");

  it("imports the Anthropic SDK (no raw fetch path)", () => {
    expect(src).toMatch(/import\(["']@anthropic-ai\/sdk["']\)/);
    expect(src).not.toMatch(/fetch\(["']https:\/\/api\.anthropic\.com/);
  });

  it("uses canonical model aliases (no date suffixes)", () => {
    expect(src).toMatch(/claude-sonnet-4-6["']/);
    expect(src).toMatch(/claude-haiku-4-5["']/);
    expect(src).not.toMatch(/claude-[a-z-]+-\d-\d-20\d{6}/);
  });

  it("writes only into the _drafts/ directory", () => {
    expect(src).toMatch(/DRAFTS_DIR/);
    expect(src).toMatch(/_drafts/);
    // No writes anywhere else.
    expect(src).not.toMatch(/writeFile\([^,]*apps\/web/);
    expect(src).not.toMatch(/writeFile\([^,]*packages\//);
  });

  it("aborts when ANTHROPIC_API_KEY is missing", () => {
    expect(src).toMatch(/ANTHROPIC_API_KEY/);
    expect(src).toMatch(/abort\(/);
  });

  it("supports a --dry-run flag for local testing", () => {
    expect(src).toMatch(/--dry-run/);
    expect(src).toMatch(/DRY_RUN/);
  });

  it("uses output_config.format json_schema for both calls (no regex JSON parsing)", () => {
    // Count occurrences of json_schema usage — should be at least 2 (draft + review).
    const matches = src.match(/json_schema/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(src).not.toMatch(/\\\{\[\\s\\S\]\*\\\}/);
  });

  it("computes a verdict the same way the runtime reviewer does", () => {
    expect(src).toMatch(/REJECT|REVISE|READY/);
    expect(src).toMatch(/blockingFindings/);
  });

  it("does not write a publishedAt field anywhere", () => {
    expect(src).not.toMatch(/publishedAt\s*[:=]\s*new\s+Date/);
    expect(src).toMatch(/status:\s*DRAFT/);
  });
});
