import { describe, expect, it } from "vitest";
import { formatCanonicalClv, projectCanonicalClv } from "./format-clv";

describe("formatCanonicalClv", () => {
  it("keeps point and probability CLV in their tagged units", () => {
    expect(formatCanonicalClv("SPREAD", "POINTS", 0.5, "NFL")).toBe("+0.5 pts");
    expect(formatCanonicalClv("TOTAL", "POINTS", -1, "NFL")).toBe("-1 pts");
    expect(formatCanonicalClv("MONEYLINE", "PROBABILITY", 0.012, "NFL")).toBe("+1.2 pp");
    expect(formatCanonicalClv("MONEYLINE", "PROBABILITY", -0.02, "NFL")).toBe("-2.0 pp");
    expect(formatCanonicalClv("MONEYLINE", "PROBABILITY", -0.0001, "NFL")).toBe("0.0 pp");
  });

  it("withholds unsupported kinds and noncanonical values", () => {
    expect(formatCanonicalClv("SPREAD", "POINTS", 0.25, "NFL")).toBeNull();
    expect(formatCanonicalClv("TOTAL", "POINTS", 0.3, "MLS")).toBeNull();
    expect(formatCanonicalClv("MONEYLINE", "PROBABILITY", 1.2, "NFL")).toBeNull();
    expect(formatCanonicalClv("SPREAD", "PROBABILITY", 0.02, "NFL")).toBeNull();
    expect(formatCanonicalClv("MONEYLINE", "POINTS", 0.5, "NFL")).toBeNull();
    expect(formatCanonicalClv("UNKNOWN", "POINTS", 0.5, "NFL")).toBeNull();
    expect(formatCanonicalClv("MONEYLINE", "PROBABILITY", 0.02, "UNKNOWN")).toBeNull();
    expect(formatCanonicalClv("MONEYLINE", "PROBABILITY", Number.NaN, "NFL")).toBeNull();
  });

  it("projects a complete compatible tuple as one publishable value", () => {
    expect(projectCanonicalClv({
      pickType: "SPREAD",
      kind: "POINTS",
      value: 0.5,
      verdict: "BEAT_CLOSE",
      sport: "NFL",
    })).toEqual({
      kind: "POINTS",
      value: 0.5,
      verdict: "BEAT_CLOSE",
      display: "+0.5 pts",
    });
    expect(projectCanonicalClv({
      pickType: "MONEYLINE",
      kind: "PROBABILITY",
      value: 0.003,
      verdict: "MATCHED_CLOSE",
      sport: "NFL",
    })).toEqual({
      kind: "PROBABILITY",
      value: 0.003,
      verdict: "MATCHED_CLOSE",
      display: "+0.3 pp",
    });
  });

  it("withholds partial, contradictory, and unit-mismatched tuples as a whole", () => {
    const base = {
      pickType: "SPREAD",
      kind: "POINTS",
      value: 0.5,
      verdict: "BEAT_CLOSE",
      sport: "NFL",
    } as const;

    expect(projectCanonicalClv({ ...base, verdict: null })).toBeNull();
    expect(projectCanonicalClv({ ...base, kind: null })).toBeNull();
    expect(projectCanonicalClv({ ...base, value: null })).toBeNull();
    expect(projectCanonicalClv({ ...base, kind: "PROBABILITY" })).toBeNull();
    expect(projectCanonicalClv({ ...base, verdict: "LOST_TO_CLOSE" })).toBeNull();
    expect(projectCanonicalClv({ ...base, sport: "UNKNOWN" })).toBeNull();
  });
});
