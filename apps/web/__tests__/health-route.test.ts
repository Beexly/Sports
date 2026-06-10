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
const checksSrc = readFileSync(resolve(repoRoot, "lib/health/checks.ts"), "utf8");
const liveSrc = readFileSync(resolve(repoRoot, "app/api/live/route.ts"), "utf8");
const readySrc = readFileSync(resolve(repoRoot, "app/api/ready/route.ts"), "utf8");

describe("/api/health", () => {
  it("exports a GET handler", () => {
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("returns a Response.json envelope (NextResponse.json)", () => {
    expect(src).toMatch(/NextResponse\.json/);
  });

  it("wraps the DB ping in try/catch (so a DB outage doesn't 500 the health probe)", () => {
    expect(checksSrc).toMatch(/try\s*\{[\s\S]*\$queryRaw[\s\S]*\}\s*catch/);
  });

  it("checks ingestion last-success freshness so a stuck pipeline reports unhealthy", () => {
    expect(checksSrc).toMatch(/ingestionRun/);
    expect(checksSrc).toMatch(/status:\s*["']SUCCESS["']/);
    expect(checksSrc).toMatch(/ageMinutes/);
    expect(checksSrc).toMatch(/lastSuccessAt/);
  });

  it("does not write to the DB (read-only probe)", () => {
    expect(checksSrc).not.toMatch(/\.create\(|\.update\(|\.delete\(|\.upsert\(/);
  });

  it("keeps /api/health as a 200 liveness summary while /api/ready is dependency-aware", () => {
    expect(src).toMatch(/status:\s*200/);
    expect(src).toMatch(/liveness_with_dependency_summary/);
    expect(liveSrc).toMatch(/status:\s*200/);
    expect(readySrc).toMatch(/payload\.ok\s*\?\s*200\s*:\s*503/);
    expect(readySrc).toMatch(/dependency_readiness/);
  });

  it("does not expose raw dependency errors in public health details", () => {
    expect(checksSrc).toMatch(/Database dependency is unavailable/);
    expect(checksSrc).toMatch(/Ingestion dependency is unavailable/);
    expect(checksSrc).toMatch(/console\.warn/);
  });
});
