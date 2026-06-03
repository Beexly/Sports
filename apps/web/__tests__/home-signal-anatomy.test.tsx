import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { AnnotatedSampleSignal } from "@/components/home/annotated-sample-signal";

/**
 * Home — "Anatomy of a signal" wiring + render.
 *
 * The AnnotatedSampleSignal card is the clearest single explainer of what a
 * published signal (and the 0–100 Edge Index) looks like. It was previously
 * built but imported nowhere; this test guards two things:
 *
 *   1. SOURCE-LEVEL: the homepage actually imports and renders the component,
 *      so it never silently regresses back to an orphaned state.
 *   2. RENDER-LEVEL: the card renders its key surfaces and the Edge Index is
 *      shown on the calibrated 0–100 scale (never above 100 — the property the
 *      Edge Index clamp fix protects).
 */

const pageSource = readFileSync(
  resolve(__dirname, "..", "app", "page.tsx"),
  "utf8"
);

describe("Homepage wires the signal-anatomy card (source-level)", () => {
  it("imports AnnotatedSampleSignal from the home components", () => {
    expect(pageSource).toMatch(
      /import\s+\{[^}]*AnnotatedSampleSignal[^}]*\}\s+from\s+["']@\/components\/home\/annotated-sample-signal["']/
    );
  });

  it("renders <AnnotatedSampleSignal /> in the page tree", () => {
    expect(pageSource).toMatch(/<AnnotatedSampleSignal\s*\/>/);
  });
});

describe("AnnotatedSampleSignal (render-level)", () => {
  it("renders the anatomy eyebrow and heading", () => {
    render(<AnnotatedSampleSignal />);
    expect(screen.getByText("Anatomy of a signal")).toBeInTheDocument();
    expect(
      screen.getByText(/this is what a published signal looks like\./i)
    ).toBeInTheDocument();
  });

  it("renders the sample pick card with grade and Edge Index surfaces", () => {
    render(<AnnotatedSampleSignal />);
    const card = screen.getByTestId("annotated-sample-signal-card");
    expect(card).toBeInTheDocument();
    expect(screen.getByText("Eclipse Gate")).toBeInTheDocument();
    expect(screen.getByText("Edge Index")).toBeInTheDocument();
  });

  it("shows the Edge Index on the 0–100 scale (never above 100)", () => {
    render(<AnnotatedSampleSignal />);
    const card = screen.getByTestId("annotated-sample-signal-card");
    const match = card.textContent?.match(/(\d+)\s*\/\s*100/);
    expect(match, "expected an N/100 Edge Index readout").not.toBeNull();
    const value = Number(match![1]);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  });

  it("keeps the variance reminder so confidence is never read as certainty", () => {
    render(<AnnotatedSampleSignal />);
    expect(screen.getByText(/still loses ~29 of 100/i)).toBeInTheDocument();
  });
});
