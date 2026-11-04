import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Homepage data-first signal contract.
 *
 * The RedlineWorld rebuild replaced the four-door FIELD home with a
 * full-viewport cinematic field. The data-first contract did not move with it:
 * the front door still renders only real loader output, still routes every
 * product surface, and still keeps the teaching chapters off the front page.
 * Two assertions were repointed to the surfaces that now own them; the
 * prohibitions are unchanged.
 */
const pageSource = readFileSync(resolve(__dirname, "..", "app", "page.tsx"), "utf8");
const worldSource = readFileSync(
  resolve(__dirname, "..", "components", "redline", "redline-world.tsx"),
  "utf8"
);
const labDoorSource = readFileSync(
  resolve(__dirname, "..", "components", "landing", "nflverse-lab-door.tsx"),
  "utf8"
);

describe("Homepage data-first signal contract", () => {
  it("does not wire the legacy annotated sample signal into the public homepage", () => {
    expect(pageSource).not.toMatch(/AnnotatedSampleSignal/);
    expect(pageSource).not.toMatch(/annotated-sample-signal/);
    expect(worldSource).not.toMatch(/AnnotatedSampleSignal/);
  });

  it("derives every homepage number from real loaders, never from literals", () => {
    // The field renders the live pack catalogue and the active writeups. The
    // board and calibration counters moved to /board and /calibration; the
    // front door carries no hard-coded record of its own.
    expect(pageSource).toMatch(/\borderPacksForStorefront\b/);
    expect(pageSource).toMatch(/\bgetActiveUpcomingWriteups\b/);
    expect(pageSource).toMatch(/\bLIVE_PACKAGE_CATALOG\b/);
    expect(labDoorSource).toMatch(/\bloadNflverseUsagePulse\b/);
    // The retracted 31-11 banner must not return to the field.
    expect(worldSource).not.toContain("31-11");
    expect(worldSource).not.toContain("VERIFIED RECORD");
  });

  it("routes the product surfaces instead of dumping every surface on the front page", () => {
    // The four-door grid became the field's stage rail, the header, and the
    // responsible close. Every destination is still one action from the front
    // door.
    expect(pageSource).toContain("RedlineWorld");
    expect(worldSource).toContain('href="/packages"');
    expect(worldSource).toContain('setPanel("board")');
    expect(worldSource).toContain('setPanel("dfs")');
    expect(pageSource).toContain('"/methodology"');
    expect(pageSource).toContain('"/responsible-play"');
    expect(pageSource).toContain('"/pricing"');
    expect(labDoorSource).toContain("The Lab");
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
