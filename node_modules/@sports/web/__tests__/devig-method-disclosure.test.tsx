import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  DEVIG_DISCLOSURE_MIN_DELTA,
  DevigMethodDisclosure,
  devigMethodDelta,
} from "@/components/picks/devig-method-disclosure";

describe("devigMethodDelta", () => {
  it("is null unless both methods produced a real number", () => {
    expect(devigMethodDelta(0.52, null)).toBeNull();
    expect(devigMethodDelta(null, 0.52)).toBeNull();
    expect(devigMethodDelta(0.52, Number.NaN)).toBeNull();
    expect(devigMethodDelta(undefined, undefined)).toBeNull();
  });

  it("is signed from proportional toward Shin", () => {
    expect(devigMethodDelta(0.5, 0.52)).toBeCloseTo(0.02, 9);
    expect(devigMethodDelta(0.52, 0.5)).toBeCloseTo(-0.02, 9);
  });
});

describe("DevigMethodDisclosure", () => {
  it("says nothing when the methods agree — no noise on balanced books", () => {
    const { container } = render(
      <DevigMethodDisclosure proportional={0.5} shin={0.5 + DEVIG_DISCLOSURE_MIN_DELTA / 2} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing rather than a fabricated number when Shin is unavailable", () => {
    const { container } = render(<DevigMethodDisclosure proportional={0.62} shin={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("discloses the second method and the gap when they disagree materially", () => {
    render(<DevigMethodDisclosure proportional={0.0805} shin={0.0655} />);
    expect(screen.getByText(/Shin de-vig: 6\.6%/)).toBeInTheDocument();
    expect(screen.getByText(/1\.5pt/)).toBeInTheDocument();
    expect(screen.getByText(/depends on de-vig method/)).toBeInTheDocument();
  });

  it("never implies the disclosed alternative is a better price to bet", () => {
    render(<DevigMethodDisclosure proportional={0.0805} shin={0.0655} />);
    const text = document.body.textContent ?? "";
    for (const forbidden of ["guarantee", "profit", "sharper price", "beat the book", "+EV"]) {
      expect(text.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});
