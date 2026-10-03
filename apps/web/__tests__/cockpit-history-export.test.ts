import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");
const ROUTE = resolve(repoRoot, "app/api/cockpit/history/export/route.ts");

describe("/api/cockpit/history/export — admin gating and shape", () => {
  const src = readFileSync(ROUTE, "utf8");

  it("imports auth()", () => {
    expect(src).toMatch(/from\s+["']@\/lib\/auth["']/);
  });

  it("rejects non-admin callers with 403", () => {
    expect(src).toMatch(/role\s*!==\s*["']ADMIN["']/);
    expect(src).toMatch(/status:\s*403/);
  });

  it("returns text/csv content-type", () => {
    expect(src).toMatch(/Content-Type[^"]*text\/csv/);
  });

  it("uses the shared buildHistoryCsv helper (no inline CSV string-building)", () => {
    expect(src).toMatch(/buildHistoryCsv/);
    // Sanity: no inline join("\\r\\n") at top-level (would suggest a re-implementation).
    expect(/return\s+new\s+NextResponse\([^)]*\.join\("\\r\\n"\)/.test(src)).toBe(false);
  });

  it("evaluates per-pick eligibility against the live readiness gate", () => {
    expect(src).toMatch(/evaluatePickEligibility/);
    expect(src).toMatch(/getReadinessGates/);
  });

  it("filters bootstrap, published, sport, model, eligible, learning via querystring", () => {
    expect(src).toMatch(/searchParams\.get\(["']bootstrap["']\)/);
    expect(src).toMatch(/searchParams\.get\(["']published["']\)/);
    expect(src).toMatch(/searchParams\.get\(["']sport["']\)/);
    expect(src).toMatch(/searchParams\.get\(["']model["']\)/);
    expect(src).toMatch(/searchParams\.get\(["']eligible["']\)/);
    expect(src).toMatch(/searchParams\.get\(["']learning["']\)/);
  });

  it("sets Cache-Control: no-store so admin exports are never cached", () => {
    expect(src).toMatch(/Cache-Control[^"]*no-store/);
  });
});
