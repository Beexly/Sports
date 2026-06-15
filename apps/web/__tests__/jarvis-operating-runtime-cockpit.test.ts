import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "app/cockpit/page.tsx"), "utf8");

describe("/cockpit Jarvis operating runtime panel", () => {
  it("wires the Jarvis operating assessment into the cockpit page", () => {
    expect(src).toMatch(/buildJarvisOperatingAssessment/);
    expect(src).toMatch(/OperatingRuntimeZone/);
    expect(src).toMatch(/data-testid="jarvis-operating-runtime"/);
  });

  it("surfaces reality counts without counting NOT_WIRED as capacity", () => {
    expect(src).toMatch(/Not Wired/);
    expect(src).toMatch(/not capacity/);
    expect(src).toMatch(/Draft Only/);
    expect(src).toMatch(/Manual/);
    expect(src).toMatch(/Operational/);
  });

  it("keeps owner decisions, Claude review, and public gate status separated", () => {
    expect(src).toMatch(/Owner decisions/);
    expect(src).toMatch(/Claude review/);
    expect(src).toMatch(/Public gate:/);
    expect(src).toMatch(/Next:/);
  });
});
