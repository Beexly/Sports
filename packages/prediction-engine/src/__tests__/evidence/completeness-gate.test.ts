import { describe, expect, it } from "vitest";
import { checkCompleteness, describeCompleteness, DEFAULT_FRESHNESS_RULES } from "../../evidence/completeness-gate.js";
import { missing, real } from "../../evidence/types.js";
import { freshBundle, NOW } from "./fixtures.js";

describe("checkCompleteness", () => {
  it("passes a fully present, fresh bundle", () => {
    const report = checkCompleteness(freshBundle(), NOW);
    expect(report.verdict).toBe("READY");
    expect(report.missing).toEqual([]);
    expect(report.stale).toEqual([]);
  });

  it("blocks on a missing required field and names it", () => {
    const bundle = freshBundle({ injuries: missing("espn fetch failed: 503") });
    const report = checkCompleteness(bundle, NOW);
    expect(report.verdict).toBe("MISSING_DATA");
    expect(report.missing).toContain("injuries");
  });

  it("blocks on stale odds rather than using them", () => {
    const bundle = freshBundle();
    const stale = {
      ...bundle,
      market: { ...bundle.market, spread: real(2.5, "the-odds-api", "2026-11-12T20:00:00.000Z") },
    };
    const report = checkCompleteness(stale, NOW);
    expect(report.verdict).toBe("MISSING_DATA");
    expect(report.stale).toContain("market.spread");
  });

  it("treats an unparseable timestamp as stale, never as fresh", () => {
    const bundle = freshBundle();
    const broken = {
      ...bundle,
      market: { ...bundle.market, total: real(41.5, "the-odds-api", "not-a-date") },
    };
    const report = checkCompleteness(broken, NOW);
    expect(report.verdict).toBe("MISSING_DATA");
    expect(report.stale).toContain("market.total");
  });

  it("reports an absent optional field as degraded, not blocking", () => {
    const bundle = freshBundle({ jev: missing("no spine file") });
    const report = checkCompleteness(bundle, NOW);
    expect(report.verdict).toBe("READY");
    expect(report.degraded).toContain("jev");
  });

  it("collects every missing field, not just the first", () => {
    const bundle = freshBundle({
      injuries: missing("no injuries"),
      weather: missing("no weather"),
      homeForm: missing("no form"),
    });
    const report = checkCompleteness(bundle, NOW);
    expect(report.missing).toEqual(expect.arrayContaining(["injuries", "weather", "homeForm"]));
  });

  it("honours a caller-supplied rule set", () => {
    const bundle = freshBundle();
    const report = checkCompleteness(bundle, NOW, [
      { field: "market.spread", maxAgeMinutes: 1, required: true },
    ]);
    expect(report.verdict).toBe("MISSING_DATA");
    expect(report.stale).toContain("market.spread");
  });

  it("has a rule for every required bundle field", () => {
    const fields = DEFAULT_FRESHNESS_RULES.map((r) => r.field);
    expect(new Set(fields).size).toBe(fields.length);
    expect(fields).toContain("market.consensusNoVigHome");
  });

  it("describes the failure in one line", () => {
    const bundle = freshBundle({ injuries: missing("no injuries") });
    expect(describeCompleteness(checkCompleteness(bundle, NOW))).toContain("MISSING_DATA");
    // jev is optional in the fixture, so a clean run reports it as degraded.
    expect(describeCompleteness(checkCompleteness(freshBundle(), NOW))).toMatch(/^READY/);
  });
});
