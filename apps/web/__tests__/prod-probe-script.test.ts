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

  it("hits /api/cockpit/jarvis when ADMIN_COOKIE is set", () => {
    expect(src).toMatch(/\/api\/cockpit\/jarvis/);
    expect(src).toMatch(/ADMIN_COOKIE/);
  });

  it("exits non-zero when /api/health is unhealthy", () => {
    expect(src).toMatch(/process\.exit\(1\)/);
  });

  it("includes the Cookie header only on admin-gated probes", () => {
    expect(src).toMatch(/headers\.Cookie\s*=\s*ADMIN_COOKIE/);
  });

  it("logs a one-line result per probe", () => {
    expect(src).toMatch(/OK.*\.padEnd\(5\)|FAIL.*\.padEnd\(5\)/);
  });
});
