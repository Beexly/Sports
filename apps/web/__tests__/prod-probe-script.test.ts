import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");
const src = readFileSync(
  resolve(repoRoot, "scripts/prod-probe.mjs"),
  "utf8"
);

describe("scripts/prod-probe.mjs", () => {
  it("requires APP_URL env var (exits non-zero when missing)", () => {
    expect(src).toMatch(/APP_URL\s*=\s*process\.env/);
    expect(src).toMatch(/process\.exit\(2\)/);
  });

  it("hits /api/health unconditionally", () => {
    expect(src).toMatch(/\/api\/health/);
  });

  it("hits critical public routes for synthetic availability checks", () => {
    expect(src).toMatch(/PUBLIC_ROUTE_PROBES/);
    expect(src).toMatch(/path:\s*"\/"/);
    expect(src).toMatch(/path:\s*"\/board"/);
    expect(src).toMatch(/path:\s*"\/ledger"/);
    expect(src).toMatch(/path:\s*"\/methodology"/);
    expect(src).toMatch(/path:\s*"\/pricing"/);
  });

  it("scans public routes for banned positioning phrases", () => {
    expect(src).toMatch(/BANNED_PUBLIC_PATTERNS/);
    expect(src).toMatch(/AI-powered/);
    expect(src).toMatch(/AI-driven/);
    expect(src).toMatch(/Mission Control/);
    expect(src).toMatch(/findBannedPublicPhrase/);
  });

  it("hits /api/cockpit/jarvis when ADMIN_COOKIE is set", () => {
    expect(src).toMatch(/\/api\/cockpit\/jarvis/);
    expect(src).toMatch(/ADMIN_COOKIE/);
  });

  it("exits non-zero when /api/health is unhealthy", () => {
    expect(src).toMatch(/process\.exit\(1\)/);
  });

  it("exits non-zero when a critical public probe fails", () => {
    expect(src).toMatch(/failPublic/);
    expect(src).toMatch(/critical public probes failed/);
  });

  it("includes the Cookie header only on admin-gated probes", () => {
    expect(src).toMatch(/headers\.Cookie\s*=\s*ADMIN_COOKIE/);
  });

  it("logs a one-line result per probe", () => {
    expect(src).toMatch(/OK.*\.padEnd\(5\)|FAIL.*\.padEnd\(5\)/);
  });

  it("can emit structured JSON for synthetic monitoring ingestion", () => {
    expect(src).toMatch(/PROD_PROBE_JSON/);
    expect(src).toMatch(/JSON\.stringify\(payload\)/);
    expect(src).toMatch(/generatedAtIso/);
    expect(src).toMatch(/bannedPattern/);
    expect(src).toMatch(/admin:\s*r\.path\.startsWith/);
  });
});
