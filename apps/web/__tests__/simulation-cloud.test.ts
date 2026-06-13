import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scoreDistribution } from "@/lib/sim/score-distribution";

/**
 * Simulation Cloud — "distribution, not fake certainty." Illustrative Poisson
 * math; pins the distribution behaviour and the surface's honesty framing.
 */

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("scoreDistribution", () => {
  it("equal rates → near-symmetric, no side favoured", () => {
    const d = scoreDistribution(2.4, 2.4);
    expect(d.homeWinProb).toBeCloseTo(d.awayWinProb, 2);
    expect(d.modalMargin).toBe(0);
  });

  it("a higher home rate tilts the win probability home", () => {
    const d = scoreDistribution(3.4, 1.6);
    expect(d.homeWinProb).toBeGreaterThan(d.awayWinProb);
    expect(d.modalMargin).toBeGreaterThan(0);
  });

  it("probabilities form a proper distribution (sum to 1)", () => {
    const d = scoreDistribution(2.6, 2.1);
    const sum = d.homeWinProb + d.tieProb + d.awayWinProb;
    expect(sum).toBeCloseTo(1, 3);
    const barSum = d.bars.reduce((s, b) => s + b.probability, 0);
    expect(barSum).toBeCloseTo(1, 3);
  });

  it("the 80% band is a real interval around the mode — the cloud has width", () => {
    const d = scoreDistribution(3.4, 1.8);
    expect(d.p80Low).toBeLessThan(d.p80High);
    expect(d.p80Low).toBeLessThanOrEqual(d.modalMargin);
    expect(d.p80High).toBeGreaterThanOrEqual(d.modalMargin);
  });

  it("clamps nonsense input instead of throwing", () => {
    expect(() => scoreDistribution(Number.NaN, -5)).not.toThrow();
  });
});

describe("the surface is honest and mounted", () => {
  const component = read("components/observatory/simulation-cloud.tsx");

  it("frames itself as illustrative, never a pick or live projection", () => {
    expect(component.toLowerCase()).toMatch(/illustrative/);
    expect(component).toMatch(/not a pick, projection, or live game read/);
  });

  it("never uses banned audit-contract terms", () => {
    const lower = component.toLowerCase();
    expect(lower).not.toMatch(/\bkelly\b/);
    expect(lower).not.toMatch(/expected\s+value/);
    expect(lower).not.toMatch(/\block\b/);
  });

  it("is keyboard-operable and mounted on the observatory", () => {
    expect(component).toContain('type="number"');
    expect(read("app/observatory/page.tsx")).toContain("SimulationCloud");
  });
});
