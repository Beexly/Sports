import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pageSource = readFileSync(resolve(__dirname, "..", "app", "page.tsx"), "utf8");
const labDoorSource = readFileSync(
  resolve(__dirname, "..", "components", "landing", "nflverse-lab-door.tsx"),
  "utf8"
);

describe("Homepage data-first signal contract", () => {
  it("does not wire the legacy annotated sample signal into the public homepage", () => {
    expect(pageSource).not.toMatch(/AnnotatedSampleSignal/);
    expect(pageSource).not.toMatch(/annotated-sample-signal/);
  });

  it("derives every homepage number from real board + calibration state", () => {
    // The concise home shows live numbers only — sourced from real loaders,
    // never fabricated literals.
    expect(pageSource).toMatch(/\bloadBoardState\b/);
    expect(pageSource).toMatch(/\bloadPublicCalibrationReport\b/);
    expect(labDoorSource).toMatch(/\bloadNflverseUsagePulse\b/);
    expect(pageSource).toContain("state.publishedToday.length");
    expect(pageSource).toContain("state.gatedTodayRows.length");
    expect(pageSource).toContain("state.scoringNow.length");
    expect(pageSource).toContain("calibration.sampleSize");
  });

  it("routes the four doors instead of dumping every surface on the front page", () => {
    // "The Lab" label lives in the NflverseLabDoor component (P16-01 moved it
    // off the page's critical path via Suspense); the other three are inline.
    for (const door of ["Board", "Intelligence", "Fantasy & Daily"]) {
      expect(pageSource).toContain(door);
    }
    expect(labDoorSource).toContain("The Lab");
    expect(pageSource).toContain("DoorCard");
    expect(pageSource).toContain('href="/board"');
    expect(labDoorSource).toContain('href="/players"');
    expect(pageSource).toContain('href="/fantasy"');
  });

  it("stays concise — the relocated teaching chapters are gone from the front door", () => {
    for (const legacy of [
      "Ten-second product test",
      "Today&apos;s lanes",
      "First trend targets",
      "GalaxyTwinPreview",
      "MarketMirageChapter",
      "DecisionAutopsyPreview",
      "ParlayMriPreview",
      "CostOfNoiseCalculator",
      "WorldWaypoints",
    ]) {
      expect(pageSource).not.toContain(legacy);
    }
  });
});
