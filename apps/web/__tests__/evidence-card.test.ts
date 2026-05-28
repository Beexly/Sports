import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { EvidenceCard } from "@/components/ui/evidence-card";

describe("EvidenceCard", () => {
  it("renders header, subject, evidence row, and body", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        EvidenceCard,
        {
          header: "Signal",
          subject: "SEA -1.5",
          evidence: {
            source: "galaxy-model",
            modelVersion: "v0.4.2",
            freshness: "fresh",
            freshnessNote: "2 min ago",
          },
        },
        "Line movement led the factor mix.",
      ),
    );

    expect(html).toContain("Signal");
    expect(html).toContain("SEA -1.5");
    expect(html).toContain("Fresh");
    expect(html).toContain("2 min ago");
    expect(html).toContain("Galaxy model");
    expect(html).toContain("v0.4.2");
    expect(html).toContain("Line movement led the factor mix.");
  });

  it("renders failure case for pick kind", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        EvidenceCard,
        {
          kind: "pick",
          header: "Pick",
          subject: "DEN -3",
          failureCase: "Backup QB underperforms historical baseline.",
          evidence: {
            source: "galaxy-model",
            freshness: "today",
          },
        },
        "Schedule and rest support the side.",
      ),
    );

    expect(html).toContain("How this can be wrong");
    expect(html).toContain("Backup QB underperforms historical baseline.");
  });

  it("renders sample badge for illustrative data", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        EvidenceCard,
        {
          header: "Example",
          subject: "Illustrative card",
          evidence: { source: "illustrative", freshness: "sample" },
        },
        "Demo content.",
      ),
    );

    expect(html).toContain("Sample");
    expect(html).toContain("Illustrative");
  });

  it("renders next-action link when provided", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        EvidenceCard,
        {
          header: "Pass",
          subject: "ATL/NYM under",
          evidence: { source: "galaxy-model", freshness: "today" },
          nextAction: { href: "/no-bet", label: "Read pass list" },
        },
        "Below publish threshold.",
      ),
    );

    expect(html).toContain('href="/no-bet"');
    expect(html).toContain("Read pass list");
  });
});
