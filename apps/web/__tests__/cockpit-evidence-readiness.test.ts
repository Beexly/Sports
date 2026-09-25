import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");
const routePath = resolve(repoRoot, "app/api/cockpit/readiness/route.ts");
const source = readFileSync(routePath, "utf8");

describe("/api/cockpit/readiness — evidence readiness report", () => {
  it("keeps the existing admin gate and cockpit route contract", () => {
    expect(source).toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(source).toMatch(/role\s*!==\s*["']ADMIN["']/);
    expect(source).toMatch(/status:\s*403/);
    expect(source).toMatch(/db\.cockpitTask\.groupBy/);
  });

  it("keeps the new report additive when its source tables are unavailable", () => {
    expect(source).toMatch(/try\s*\{[\s\S]*loadEvidenceReadiness[\s\S]*\}\s*catch/);
    expect(source).toMatch(/evidenceReadinessError\s*=\s*["']unavailable["']/);
    expect(source).toMatch(/status:\s*evidenceReadinessError/);
  });

  it("calls the real evidence-readiness loader through a narrow database seam", () => {
    expect(source).toMatch(/loadEvidenceReadiness/);
    expect(source).toMatch(/loadEvidenceReadiness\(db,\s*\{\s*limit:\s*500\s*\}\)/);
    expect(source).toMatch(/reportAllFactorReadiness/);
  });

  it("exposes the complete matrix without turning it into a gate", () => {
    expect(source).toMatch(/evidenceReadiness:/);
    expect(source).toMatch(/rows:\s*evidenceReadiness\.rows/);
    expect(source).not.toMatch(/canExposePublicPicks\s*&&\s*evidenceReadiness/);
    expect(source).not.toMatch(/evidenceReadiness[\s\S]{0,200}(status:\s*503|status:\s*403)/);
  });
});
