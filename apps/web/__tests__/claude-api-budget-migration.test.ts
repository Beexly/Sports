import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLAUDE_API_SURFACES,
  DEFAULT_CLAUDE_API_BUDGETS,
} from "@/lib/claude-api/cost-monitor";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(
  path.join(
    repoRoot,
    "packages/db/prisma/migrations/20260523031000_seed_claude_api_budgets/migration.sql"
  ),
  "utf8"
);

describe("Claude API budget seed migration", () => {
  it("seeds every budgeted surface with the locked monthly budget", () => {
    for (const surface of CLAUDE_API_SURFACES) {
      expect(migration).toContain(`'${surface}'`);
      expect(migration).toContain(`${DEFAULT_CLAUDE_API_BUDGETS[surface].monthlyBudgetUsd}.00`);
    }
  });

  it("uses the shared alert thresholds and remains idempotent", () => {
    expect(migration).toContain('"yellow":0.5');
    expect(migration).toContain('"orange":0.8');
    expect(migration).toContain('"red":1');
    expect(migration).toContain('"hardCap":1.5');
    expect(migration).toMatch(/ON CONFLICT \("surface"\) DO UPDATE/);
  });
});
