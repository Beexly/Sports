import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");
const page = readFileSync(resolve(repoRoot, "app/cockpit/page.tsx"), "utf8");
// The runtime read now renders through the living CockpitPulse centerpiece.
const pulse = readFileSync(resolve(repoRoot, "components/cockpit/cockpit-pulse.tsx"), "utf8");

describe("/cockpit Jarvis operating runtime panel", () => {
  it("wires the Jarvis operating assessment into the cockpit page", () => {
    expect(page).toMatch(/buildJarvisOperatingAssessment/);
    expect(page).toMatch(/OperatingRuntimeZone/);
    expect(page).toMatch(/CockpitPulse/);
    expect(pulse).toMatch(/data-testid="jarvis-operating-runtime"/);
  });

  it("surfaces reality counts without counting NOT_WIRED as capacity", () => {
    expect(pulse).toMatch(/Not wired/i);
    expect(pulse).toMatch(/not capacity/);
    expect(pulse).toMatch(/Draft only/i);
    expect(pulse).toMatch(/Manual/);
    expect(pulse).toMatch(/Operational/);
  });

  it("keeps owner decisions, Claude review, and public gate status separated", () => {
    expect(pulse).toMatch(/Owner decisions/);
    expect(pulse).toMatch(/Claude review/);
    expect(pulse).toMatch(/Public gate/);
    expect(pulse).toMatch(/Next/);
  });
});
