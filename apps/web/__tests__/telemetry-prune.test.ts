import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const SCRIPT = resolve(REPO_ROOT, "scripts/prune-claude-usage-logs.mjs");
const WORKFLOW = resolve(REPO_ROOT, ".github/workflows/telemetry-prune.yml");

describe("scripts/prune-claude-usage-logs.mjs", () => {
  const src = readFileSync(SCRIPT, "utf8");

  it("uses claudeUsageLog.deleteMany with a ts lt cutoff", () => {
    expect(src).toMatch(/claudeUsageLog\.deleteMany/);
    expect(src).toMatch(/ts:\s*\{\s*lt:\s*cutoff/);
  });

  it("exits 0 when DATABASE_URL is not set (graceful no-op)", () => {
    expect(src).toMatch(/DATABASE_URL/);
    expect(src).toMatch(/nothing to prune/i);
    expect(src).toMatch(/process\.exit\(0\)/);
  });

  it("defaults to 90-day retention window", () => {
    expect(src).toMatch(/DEFAULT_RETENTION_DAYS\s*=\s*90/);
    expect(src).toMatch(/CLAUDE_LOG_RETENTION_DAYS/);
  });

  it("exits 1 on invalid CLAUDE_LOG_RETENTION_DAYS", () => {
    expect(src).toMatch(/process\.exit\(1\)/);
  });

  it("emits a JSON result line with rowsDeleted + retentionDays + cutoffDate", () => {
    expect(src).toMatch(/rowsDeleted/);
    expect(src).toMatch(/retentionDays/);
    expect(src).toMatch(/cutoffDate/);
    expect(src).toMatch(/prunedAt/);
  });

  it("reports rowsFoundBefore so the operator can see the before count", () => {
    expect(src).toMatch(/rowsFoundBefore/);
    expect(src).toMatch(/claudeUsageLog\.count/);
  });

  it("disconnects Prisma in a finally block", () => {
    expect(src).toMatch(/prisma\.\$disconnect/);
    const tryIdx = src.indexOf("prisma.claudeUsageLog.count");
    const finallyIdx = src.indexOf("finally {", tryIdx);
    const disconnectIdx = src.indexOf("$disconnect", finallyIdx);
    expect(finallyIdx).toBeGreaterThan(tryIdx);
    expect(disconnectIdx).toBeGreaterThan(finallyIdx);
  });

  it("exits 1 on Prisma error (not 0 — callers must distinguish success vs failure)", () => {
    const catchIdx = src.indexOf("} catch");
    const exitOneIdx = src.indexOf("process.exit(1)", catchIdx);
    expect(exitOneIdx).toBeGreaterThan(catchIdx);
  });

  it("never calls Claude (no @anthropic-ai/sdk)", () => {
    expect(src).not.toMatch(/@anthropic-ai\/sdk/);
    expect(src).not.toMatch(/api\.anthropic\.com/);
  });

  it("does not write a publishedAt or auto-merge path", () => {
    expect(src).not.toMatch(/publishedAt/);
    expect(src).not.toMatch(/auto.?merge|gh\s+pr\s+merge/i);
  });
});

describe(".github/workflows/telemetry-prune.yml", () => {
  const src = readFileSync(WORKFLOW, "utf8");

  it("runs weekly on Sunday + supports workflow_dispatch", () => {
    expect(src).toMatch(/schedule:/);
    expect(src).toMatch(/cron:.*0\s+3\s+\*\s+\*\s+0/);
    expect(src).toMatch(/workflow_dispatch:/);
  });

  it("accepts an optional retention_days input (defaults to 90)", () => {
    expect(src).toMatch(/retention_days/);
    expect(src).toMatch(/default:\s*["']?90["']?/);
  });

  it("injects DATABASE_URL + DIRECT_URL from secrets", () => {
    expect(src).toMatch(/DATABASE_URL:\s*\$\{\{\s*secrets\.DATABASE_URL\s*\}\}/);
    expect(src).toMatch(/DIRECT_URL:\s*\$\{\{\s*secrets\.DIRECT_URL\s*\}\}/);
  });

  it("passes CLAUDE_LOG_RETENTION_DAYS from the dispatch input or default", () => {
    expect(src).toMatch(/CLAUDE_LOG_RETENTION_DAYS/);
  });

  it("references the prune script", () => {
    expect(src).toMatch(/prune-claude-usage-logs\.mjs/);
  });

  it("requires only contents:read — no write permissions", () => {
    expect(src).toMatch(/contents:\s*read/);
    expect(src).not.toMatch(/contents:\s*write/);
    expect(src).not.toMatch(/pull-requests:\s*write/);
  });

  it("does NOT request ANTHROPIC_API_KEY (zero Claude spend)", () => {
    expect(src).not.toMatch(/ANTHROPIC_API_KEY/);
  });
});
