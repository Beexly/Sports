import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { PickEvidenceSection, ageToFreshness } from "@/components/picks/PickEvidenceSection";

describe("PickEvidenceSection", () => {
  it("renders SourceFreshnessLabel with galaxy-model source for pick kind", () => {
    const html = renderToStaticMarkup(
      React.createElement(PickEvidenceSection, {
        kind: "pick",
        source: "galaxy-model",
        freshness: "fresh",
        failureCase: "If the line moves past -3.5, the edge collapses.",
      }),
    );
    expect(html).toContain("Galaxy model");
    expect(html).toContain("Fresh");
  });

  it("renders failureCase row when kind is pick", () => {
    const failureCase = "Sharp reverse movement would invalidate this read.";
    const html = renderToStaticMarkup(
      React.createElement(PickEvidenceSection, {
        kind: "pick",
        source: "galaxy-model",
        freshness: "today",
        failureCase,
      }),
    );
    expect(html).toContain("What would change this read");
    expect(html).toContain(failureCase);
  });

  it("does not render failureCase row for signal kind", () => {
    const html = renderToStaticMarkup(
      React.createElement(PickEvidenceSection, {
        kind: "signal",
        source: "aggregate",
        freshness: "fresh",
      }),
    );
    expect(html).not.toContain("What would change this read");
  });

  it("does not render failureCase row when kind is omitted (default signal)", () => {
    const html = renderToStaticMarkup(
      React.createElement(PickEvidenceSection, {
        source: "provider",
        freshness: "live",
      }),
    );
    expect(html).not.toContain("What would change this read");
    expect(html).toContain("Provider");
    expect(html).toContain("Live");
  });

  it("renders modelVersion badge when provided", () => {
    const html = renderToStaticMarkup(
      React.createElement(PickEvidenceSection, {
        kind: "pick",
        source: "galaxy-model",
        freshness: "fresh",
        failureCase: "N/A",
        modelVersion: "v0.4.2",
      }),
    );
    expect(html).toContain("v0.4.2");
  });

  it("does not render modelVersion badge when omitted", () => {
    const html = renderToStaticMarkup(
      React.createElement(PickEvidenceSection, {
        kind: "pick",
        source: "galaxy-model",
        freshness: "fresh",
        failureCase: "N/A",
      }),
    );
    expect(html).not.toContain("v0.");
  });
});

describe("ageToFreshness", () => {
  it("returns live for age < 5 minutes", () => {
    expect(ageToFreshness(0)).toBe("live");
    expect(ageToFreshness(4)).toBe("live");
  });

  it("returns fresh for age 5–119 minutes", () => {
    expect(ageToFreshness(5)).toBe("fresh");
    expect(ageToFreshness(119)).toBe("fresh");
  });

  it("returns today for age 120–1439 minutes", () => {
    expect(ageToFreshness(120)).toBe("today");
    expect(ageToFreshness(1439)).toBe("today");
  });

  it("returns stale for age >= 1440 minutes", () => {
    expect(ageToFreshness(1440)).toBe("stale");
    expect(ageToFreshness(10000)).toBe("stale");
  });

  it("returns unknown for null", () => {
    expect(ageToFreshness(null)).toBe("unknown");
  });
});
