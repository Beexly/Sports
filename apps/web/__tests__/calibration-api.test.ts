import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Calibration API source-level invariants.
 *
 * The full route module spins up Prisma and an admin session, neither of
 * which the unit suite can stand up here. Instead we assert at the source
 * level that the route enforces:
 *
 *   - admin-only gate
 *   - INTERNAL_ONLY mode marker
 *   - autoPublish / autoSend / automatedBetting are hard-coded false
 *   - guardrails block external posting and automated betting
 *   - the page-side internal-only banner is present
 *   - POST is blocked with a 405
 */

const repoRoot = resolve(__dirname, "..");
const routeSrc = readFileSync(
  resolve(repoRoot, "app/api/cockpit/calibration/route.ts"),
  "utf8"
);
const pageSrc = readFileSync(
  resolve(repoRoot, "app/cockpit/calibration/page.tsx"),
  "utf8"
);

describe("Calibration cockpit / API — internal-only invariants", () => {
  it("API route enforces ADMIN-only", () => {
    expect(routeSrc).toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(routeSrc).toMatch(/role\s*!==\s*["']ADMIN["']/);
  });

  it("API payload declares mode INTERNAL_ONLY", () => {
    expect(routeSrc).toMatch(/mode\s*:\s*["']INTERNAL_ONLY["']/);
  });

  it("API payload hard-codes autoPublish, autoSend, automatedBetting to false", () => {
    expect(routeSrc).toMatch(/autoPublish\s*:\s*false/);
    expect(routeSrc).toMatch(/autoSend\s*:\s*false/);
    expect(routeSrc).toMatch(/automatedBetting\s*:\s*false/);
  });

  it("API payload exposes the no-external-posting and no-automated-betting guardrails", () => {
    expect(routeSrc).toMatch(/noAutoPublish\s*:\s*true/);
    expect(routeSrc).toMatch(/noAutoSend\s*:\s*true/);
    expect(routeSrc).toMatch(/noExternalPosting\s*:\s*true/);
    expect(routeSrc).toMatch(/noAutomatedBetting\s*:\s*true/);
    expect(routeSrc).toMatch(/internalOnly\s*:\s*true/);
  });

  it("API POST is blocked with a 405", () => {
    expect(routeSrc).toMatch(/export\s+async\s+function\s+POST/);
    expect(routeSrc).toMatch(/status\s*:\s*405/);
  });

  it("API does not write publishedAt or flip status to PUBLISHED anywhere", () => {
    expect(routeSrc).not.toMatch(/publishedAt\s*:\s*new\s+Date/);
    expect(routeSrc).not.toMatch(/status\s*:\s*["']PUBLISHED["']/);
  });

  it("page contains the internal-only / no-publish / no-send / no-betting banner", () => {
    expect(pageSrc).toMatch(/Internal calibration only/i);
    expect(pageSrc).toMatch(/No auto-publish/i);
    expect(pageSrc).toMatch(/No auto-send/i);
    expect(pageSrc).toMatch(/No automated betting/i);
  });

  it("page does not expose publish / send / bet controls", () => {
    expect(pageSrc).not.toMatch(/<button[^>]*>\s*Publish/i);
    expect(pageSrc).not.toMatch(/<button[^>]*>\s*Send/i);
    expect(pageSrc).not.toMatch(/<button[^>]*>\s*Place\s+bet/i);
  });
});
