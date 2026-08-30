import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");

function read(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("Airwave Cockpit — Intelligence Intake Sections", () => {
  const cockpit = read("app/cockpit/airwave/page.tsx");

  it("imports readIntelligenceControlPlane", () => {
    expect(cockpit).toMatch(/readIntelligenceControlPlane/);
  });

  it("renders Intelligence Intake Posture section", () => {
    expect(cockpit).toMatch(/intelligence-intake-posture/);
    expect(cockpit).toMatch(/Intelligence Intake Posture/);
  });

  it("renders CH87 lane status testid", () => {
    expect(cockpit).toMatch(/data-testid="ch87-lane-status"/);
  });

  it("renders GSE/GSN output readiness section", () => {
    expect(cockpit).toMatch(/data-testid="gse-gsn-output-readiness"/);
    expect(cockpit).toMatch(/GSE \/ GSN Output Readiness/);
  });

  it("renders intelligence intake lanes section", () => {
    expect(cockpit).toMatch(/data-testid="intelligence-intake-lanes"/);
    expect(cockpit).toMatch(/Intelligence Intake Lanes/);
  });

  it("renders next operator actions section", () => {
    expect(cockpit).toMatch(/data-testid="next-operator-actions"/);
    expect(cockpit).toMatch(/Next Operator Actions/);
  });

  it("links to the intelligence readiness API", () => {
    expect(cockpit).toMatch(/href="\/api\/airwave\/intelligence-readiness"/);
  });

  it("still renders all original sections unchanged", () => {
    // All original testids and content preserved
    expect(cockpit).toMatch(/Airwave Control Room/);
    expect(cockpit).toMatch(/readAirwaveControlPlane/);
    expect(cockpit).toMatch(/readAirwaveIntakeReadiness/);
    expect(cockpit).toMatch(/Transcript intake validator/);
    expect(cockpit).toMatch(/Spreadsheet contract/);
    expect(cockpit).toMatch(/Do-not-automate boundary/);
    expect(cockpit).toMatch(/data-testid="internal-only-banner"/);
    expect(cockpit).toMatch(/href="\/api\/airwave\/readiness"/);
    expect(cockpit).toMatch(/href="\/api\/airwave\/intake-readiness"/);
  });

  it("does not expose source_pointer_private as a rendered value in the cockpit", () => {
    // source_pointer_private must never appear as a data display value in the cockpit page
    // It may appear as a type import or comment but not as a JSX value expression
    expect(cockpit).not.toMatch(/\{.*source_pointer_private.*\}/);
  });

  it("shows no-capture and no-auto-publish language in intelligence section", () => {
    expect(cockpit).toMatch(/No capture/);
    expect(cockpit).toMatch(/No auto-publish/);
  });
});
