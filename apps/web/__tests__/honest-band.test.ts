import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assessUncertainty } from "@sports/prediction-engine";

/**
 * The Honest Band — assessUncertainty (Wilson interval + reliability tier +
 * limitation flags) finally has a public consumer on the calibration report.
 * Pins: the engine math behaves, the panel renders the band, flags map to
 * vetted copy only.
 */

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("assessUncertainty consumed honestly", () => {
  it("thin samples are insufficient and never trustworthy", () => {
    const d = assessUncertainty({ probability: 0.6, sampleSize: 5 });
    expect(d.reliability).toBe("insufficient");
    expect(d.trustworthy).toBe(false);
    expect(d.flags).toContain("small_sample");
  });

  it("large clean samples earn a tight, trustworthy band", () => {
    const d = assessUncertainty({ probability: 0.55, sampleSize: 500 });
    expect(d.reliability).toBe("high");
    expect(d.trustworthy).toBe(true);
    expect(d.intervalLow).toBeLessThan(0.55);
    expect(d.intervalHigh).toBeGreaterThan(0.55);
  });
});

describe("HonestBand surface", () => {
  const band = read("components/performance/honest-band.tsx");
  const panel = read("components/performance/calibration-panel.tsx");

  it("renders inside the calibration panel from real report data", () => {
    expect(panel).toContain("HonestBand");
    expect(panel).toMatch(/overallObserved/);
    expect(band).toContain('data-testid="honest-band"');
  });

  it("maps every limitation flag token to vetted copy", () => {
    for (const flag of [
      "small_sample",
      "low_evidence",
      "stale_data",
      "regime_shift",
      "wide_interval",
    ]) {
      expect(band).toContain(flag);
    }
  });

  it("frames the number as a band, not a point claim", () => {
    expect(band).toContain("not a point claim");
    expect(band).toMatch(/insufficient/);
  });

  it("uses world tokens and the shared numeric standard", () => {
    expect(band).toContain("NUMERIC_TEXT_CLASS");
    const raw = band.match(/(?:text|bg|border)-(?:gray|green|red|yellow)-\d+/g);
    expect(raw ?? []).toEqual([]);
  });
});
