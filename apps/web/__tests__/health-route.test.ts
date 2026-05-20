import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * /api/health source-level contract.
 *
 * prod-probe.mjs and any external uptime monitor hit this route. The
 * shape is part of the deploy verification surface; pin it.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "app/api/health/route.ts"), "utf8");

describe("/api/health", () => {
  it("exports a GET handler", () => {
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("returns a Response.json envelope (NextResponse.json)", () => {
    expect(src).toMatch(/NextResponse\.json/);
  });

  it("wraps the DB ping in try/catch (so a DB outage doesn't 500 the health probe)", () => {
    expect(src).toMatch(/try\s*\{[\s\S]*\$queryRaw[\s\S]*\}\s*catch/);
  });

  it("checks ingestion last-success freshness so a stuck pipeline reports unhealthy", () => {
    expect(src).toMatch(/ingestionRun/);
    expect(src).toMatch(/status:\s*["']SUCCESS["']/);
  });

  it("does not write to the DB (read-only probe)", () => {
    expect(src).not.toMatch(/\.create\(|\.update\(|\.delete\(|\.upsert\(/);
  });
});
