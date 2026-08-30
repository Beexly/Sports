import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "..", "..", "..");

function read(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("media revenue studio audit handoff", () => {
  const audit = read("docs/media/CODEX_MEDIA_REVENUE_STUDIO_AUDIT.md");
  const completionAudit = read("docs/media/MEDIA_REVENUE_STUDIO_COMPLETION_AUDIT.md");
  const os = read("docs/media/GSE_MEDIA_REVENUE_OS.md");
  const compliance = read("docs/media/CONTENT_COMPLIANCE_POLICY.md");
  const gitignore = read(".gitignore");

  it("keeps a Claude-visible implementation audit in the repo", () => {
    expect(os).toContain("docs/media/CODEX_MEDIA_REVENUE_STUDIO_AUDIT.md");
    expect(audit).toContain("Prompt source hash: `89152874fe814a6158c39aeb2ee9e66c188cc5a07e338dc4f20abac4516bcbd3`");
    expect(audit).toContain("Claude Handoff");
    expect(audit).toContain("Requirement Traceability");
    expect(completionAudit).toContain("Branch: `codex/media-revenue-metric-api-closeout`");
    expect(completionAudit).toContain("Requirement-by-requirement");
  });

  it("documents the safety-preserving hero copy substitution", () => {
    expect(audit).toContain("Prompt Conflict Resolved");
    expect(audit).toContain("not tout culture");
    expect(audit).toContain("trust gate bans");
    expect(compliance).toContain('No "lock".');
  });

  it("preserves no-live-integration boundaries", () => {
    for (const boundary of [
      "No secrets, API keys, credentials, paid SDKs, external posting integrations, scrapers, or provider mutations were added.",
      "No live audience analytics are connected.",
      "No newsletter provider is integrated.",
      "No real social publishing integration exists.",
      "no auto-publish",
    ]) {
      expect(`${audit}\n${completionAudit}`).toContain(boundary);
    }
  });

  it("records broad closeout status without inventing live API or AWS readiness", () => {
    expect(completionAudit).toContain("B2B Evidence API");
    expect(completionAudit).toContain("Status: PARTIAL / INTENTIONALLY DEFERRED");
    expect(completionAudit).toContain("No live AWS calls.");
    expect(completionAudit).toContain("No AWS credentials.");
    expect(completionAudit).toContain("No paid AWS resources.");
  });

  it("keeps generated runtime debris ignored", () => {
    for (const ignored of [".agent/logs/", "scrapes/", "tmp/", ".cache/"]) {
      expect(gitignore).toContain(ignored);
    }
  });

  it("keeps the next slice framed as a recommendation instead of hidden extra work", () => {
    expect(audit).toContain("Recommended Next Slice");
    expect(audit).toContain("Content Production Queue");
    expect(audit).toContain("80 starter content ideas loaded as structured data");
  });
});
