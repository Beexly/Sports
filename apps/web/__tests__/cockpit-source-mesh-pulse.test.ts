import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * /cockpit/page.tsx — Source Mesh pulse contract.
 *
 * The cockpit overview shows a health summary for the Source Acquisition
 * Mesh: total registered sources, healthy count, circuit-open count,
 * and awaiting-license count. This pins the implementation so a future
 * refactor doesn't silently remove the operator's view of source health.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "app/cockpit/page.tsx"), "utf8");

describe("/cockpit source mesh pulse — implementation contract", () => {
  it("queries db.dataSource for total, healthy, circuit-open, and awaiting-license counts", () => {
    expect(src).toMatch(/db\.dataSource\.count/);
    expect(src).toMatch(/sourceTotalCount/);
    expect(src).toMatch(/sourceHealthyCount/);
    expect(src).toMatch(/sourceCircuitOpenCount/);
    expect(src).toMatch(/sourceAwaitingLicenseCount/);
  });

  it("wraps dataSource counts in Promise.all with .catch fallbacks", () => {
    expect(src).toMatch(/Promise\.all\(/);
    const catchCount = (src.match(/\.catch\(\(\)\s*=>\s*0\)/g) ?? []).length;
    expect(catchCount).toBeGreaterThanOrEqual(4);
  });

  it("renders the source mesh pulse section with data-testid", () => {
    expect(src).toMatch(/data-testid="cockpit-source-mesh-pulse"/);
  });

  it("links to /cockpit/sources from the pulse section", () => {
    expect(src).toMatch(/href="\/cockpit\/sources"/);
  });

  it("shows registration hint when no sources exist", () => {
    expect(src).toMatch(/sourceTotalCount\s*===\s*0/);
    expect(src).toMatch(/register-sources\.mjs/);
  });

  it("shows circuit open warning when circuits are open", () => {
    expect(src).toMatch(/sourceCircuitOpenCount\s*>\s*0/);
    expect(src).toMatch(/circuit open/i);
  });

  it("shows awaiting license warning when licenses are pending", () => {
    expect(src).toMatch(/sourceAwaitingLicenseCount\s*>\s*0/);
    expect(src).toMatch(/awaiting license/i);
  });
});
