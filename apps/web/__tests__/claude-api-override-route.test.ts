import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const route = fs.readFileSync(
  path.join(repoRoot, "apps/web/app/api/cockpit/api-costs/override/route.ts"),
  "utf8"
);

describe("Claude API budget override route", () => {
  it("is admin-gated and validates the budget surface", () => {
    expect(route).toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(route).toMatch(/role\s*!==\s*["']ADMIN["']/);
    expect(route).toContain("CLAUDE_API_SURFACES");
    expect(route).toContain("invalid-request");
  });

  it("requires a decision-log reason and writes only override fields", () => {
    expect(route).toContain("reason-required");
    expect(route).toContain("A decision-log reason is required.");
    expect(route).toContain("db.claudeApiBudget.upsert");
    expect(route).toContain("overrideActive");
    expect(route).toContain("overrideExpiresAt");
    expect(route).not.toMatch(/monthlyBudgetUsd:\s*body/);
  });
});
