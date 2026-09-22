import { describe, expect, it } from "vitest";
import { renderLabeledPick, validateDisplay } from "./probability-display";

const good = {
  modelProb: 0.62,
  marketProb: 0.55,
  price: "-130",
  source: "Book X",
  timestamp: "2026-09-22T12:00:00Z",
  settlement: "OT counts",
  liquidity: "low limits",
};

describe("probability-display", () => {
  it("renders three distinctly labeled numbers plus caveats", () => {
    const d = renderLabeledPick(good);
    expect(d.valid).toBe(true);
    expect(d.issues).toEqual([]);
    expect(d.lines[0]).toContain("Model probability: 62.0%");
    expect(d.lines[1]).toContain("Market-implied probability: 55.0%");
    expect(d.lines[2]).toContain("Price: -130");
    expect(d.lines.some((l) => l.includes("Settlement: OT counts"))).toBe(true);
    expect(d.lines.some((l) => l.includes("Liquidity: low limits"))).toBe(true);
    expect(d.lines[d.lines.length - 1]).toContain("Context:");
  });
  it("validateDisplay flags missing labels", () => {
    expect(validateDisplay({ ...good, source: "" })).toContain("source missing");
    expect(validateDisplay({ ...good, modelProb: 2 })).toContain("modelProb not in [0,1]");
    expect(validateDisplay({ ...good, settlement: "" })).toContain("settlement missing");
  });
  it("flags identical model/market probabilities as ambiguous", () => {
    const issues = validateDisplay({ ...good, modelProb: 0.55, marketProb: 0.55 });
    expect(issues.join()).toContain("identical");
  });
  it("liquidity line is optional", () => {
    const { liquidity: _l, ...rest } = good;
    const d = renderLabeledPick(rest);
    expect(d.valid).toBe(true);
    expect(d.lines.some((l) => l.startsWith("Liquidity:"))).toBe(false);
  });
});
