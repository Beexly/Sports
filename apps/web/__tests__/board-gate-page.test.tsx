import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

/**
 * /board/gate — the gate decided live, in front of the reader.
 *
 * The page's whole value rests on two properties, so both are pinned:
 *
 *  1. It runs the REAL gate. If the decision logic were ever swapped for
 *     hand-written outcomes, the page would become the thing it argues
 *     against. The reason strings come from the consumer, so asserting they
 *     match the consumer's own vocabulary catches a divergence.
 *  2. It never asserts a performance number. This is a public honesty surface;
 *     a stray percentage here would be exactly the fabrication the product
 *     refuses elsewhere.
 */

vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));

import GatePage, { metadata } from "@/app/board/gate/page";

const DIGIT_PERCENT = /\d+(\.\d+)?%/;

describe("/board/gate", () => {
  it("renders without a live database dependency", () => {
    expect(() => render(<GatePage />)).not.toThrow();
  });

  it("shows all three kinds of 'no' as distinct, named states", () => {
    const { container } = render(<GatePage />);
    const text = container.textContent ?? "";

    // The distinction is the point of the page.
    expect(text).toContain("No bet");
    expect(text).toContain("Not judged");
    expect(text).toContain("Not evaluated");
    expect(text).toContain("Collapsing these into a single");
  });

  it("surfaces the gate's own reason vocabulary, not page-authored copy", () => {
    const { container } = render(<GatePage />);
    const text = container.textContent ?? "";

    // These strings live in gate-consumer.ts. If the page ever stops calling
    // the real consumer, they disappear and this fails.
    expect(text).toContain("not enough settled history");
    expect(text).toContain("not a judgement about the game");
  });

  it("states plainly that the inputs are illustrative and the logic is real", () => {
    const { container } = render(<GatePage />);
    const text = container.textContent ?? "";

    expect(text).toContain("The decision logic is production code");
    expect(text).toContain("The input rows are illustrative");
    expect(text.toLowerCase()).toContain("not today's slate");
  });

  it("asserts NO performance number anywhere on the page", () => {
    const { container } = render(<GatePage />);
    const text = container.textContent ?? "";

    // A digit-percent is the actual fabrication signal — a rate presented as
    // fact. Absence of one is the property that matters.
    expect(text).not.toMatch(DIGIT_PERCENT);

    // "win rate" and "roi" DO appear on the page, inside its own non-claim
    // ("No win rate, ROI, or edge is asserted..."). A naive substring ban
    // would fail on the disclaimer itself — punishing the page for being
    // explicit about what it refuses to claim. So assert the disclaimer is
    // present rather than banning the words.
    expect(text).toContain("No win rate, ROI, or edge is asserted");

    // These have no honest use on this surface in any context.
    expect(text.toLowerCase()).not.toContain("proven");
    expect(text.toLowerCase()).not.toContain("guaranteed");
  });

  it("discloses the edge threshold rather than leaving the bar implicit", () => {
    const { container } = render(<GatePage />);
    const text = container.textContent ?? "";

    // A reader cannot judge the outcomes without knowing the bar they were
    // judged against. Pinned so the threshold can never quietly become a
    // tuned, undisclosed number.
    expect(text).toContain("edge threshold");
    expect(text).toContain("with no added margin");
  });

  it("carries explicit non-claims, including that nothing is persisted", () => {
    const { container } = render(<GatePage />);
    const text = container.textContent ?? "";

    expect(text).toContain("What this page does not claim");
    expect(text).toContain("Nothing here is persisted to the ledger");
    expect(text).toContain("not today's published picks");
  });

  it("distinguishes itself from the agent-governance claim", () => {
    const { container } = render(<GatePage />);
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/integrity");
    expect(container.textContent).toContain("separate claim about a separate subject");
  });

  it("is deterministic — two renders produce identical decisions", () => {
    const a = render(<GatePage />).container.textContent;
    const b = render(<GatePage />).container.textContent;
    expect(a).toBe(b);
  });

  it("sets a canonical metadata entry", () => {
    expect(metadata.alternates?.canonical).toBe("/board/gate");
  });
});
