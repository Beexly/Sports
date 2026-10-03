import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const route = fs.readFileSync(
  path.join(repoRoot, "apps/web/app/api/room/[gameId]/model-court/route.ts"),
  "utf8"
);

describe("Model Court API route", () => {
  it("is server-side gated by auth and Pro-or-Elite entitlement", () => {
    expect(route).toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(route).toMatch(/getUserEntitlements/);
    expect(route).toMatch(/canSeeFactorBreakdown/);
    expect(route).toContain("subscription-required");
  });

  it("loads the Game Room evidence node and routes through the budgeted answer runtime", () => {
    expect(route).toContain("loadGameRoom");
    expect(route).toContain("answerModelCourtQuestion");
    expect(route).toContain("detectModelCourtRefusal");
    expect(route).toContain('process.env["ANTHROPIC_API_KEY"]');
    expect(route).toContain("recordUsage: true");
    expect(route).toContain('session.user.id === "dev-admin" ? null : session.user.id');
  });

  it("keeps the first API slice game-scoped", () => {
    expect(route).toContain("ASK_THIS_GAME");
    expect(route).toContain("EXPLAIN_FOR_MY_LENS");
    expect(route).not.toContain("ASK_THE_SLATE");
  });
});
