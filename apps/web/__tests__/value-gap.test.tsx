import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeValueGap, ValueGapBadge } from "@/components/picks/value-gap";

/**
 * S7 — the "GSE vs market" number, derived from fields the pick already
 * carries (rankingP, marketFairProb). No new data path, no Kalshi.
 */

describe("computeValueGap — pure function", () => {
  it("computes p - q when both are real", () => {
    const r = computeValueGap({ rankingP: 0.58, marketFairProb: 0.5 });
    expect(r).not.toBeNull();
    expect(r!.gap).toBeCloseTo(0.08, 10);
    expect(r!.sign).toBe("positive");
  });

  it("sign is negative when the model disagrees below the market", () => {
    const r = computeValueGap({ rankingP: 0.42, marketFairProb: 0.5 });
    expect(r!.gap).toBeCloseTo(-0.08, 10);
    expect(r!.sign).toBe("negative");
  });

  it("sign is 'flat' within the display-precision epsilon, not just at exact equality", () => {
    expect(computeValueGap({ rankingP: 0.5, marketFairProb: 0.5 })!.sign).toBe("flat");
    expect(computeValueGap({ rankingP: 0.5001, marketFairProb: 0.5 })!.sign).toBe("flat");
  });

  it("returns null when either input is missing, null, or non-finite", () => {
    expect(computeValueGap({ rankingP: null, marketFairProb: 0.5 })).toBeNull();
    expect(computeValueGap({ rankingP: 0.5, marketFairProb: undefined })).toBeNull();
    expect(computeValueGap({ rankingP: NaN, marketFairProb: 0.5 })).toBeNull();
    expect(computeValueGap({ rankingP: 0.5, marketFairProb: Infinity })).toBeNull();
  });

  it("returns null when either input is outside [0, 1]", () => {
    expect(computeValueGap({ rankingP: 1.2, marketFairProb: 0.5 })).toBeNull();
    expect(computeValueGap({ rankingP: 0.5, marketFairProb: -0.1 })).toBeNull();
  });

  it("boundary values 0 and 1 are valid", () => {
    expect(computeValueGap({ rankingP: 0, marketFairProb: 1 })).toEqual({ gap: -1, sign: "negative" });
    expect(computeValueGap({ rankingP: 1, marketFairProb: 0 })).toEqual({ gap: 1, sign: "positive" });
  });
});

describe("ValueGapBadge — component", () => {
  it("renders the gap when both p and q are present", () => {
    render(<ValueGapBadge rankingP={0.58} marketFairProb={0.5} />);
    const badge = screen.getByTestId("value-gap-badge");
    expect(badge.textContent).toContain("GSE vs market");
    expect(badge.textContent).toContain("+8.0pp");
  });

  it("renders nothing when marketFairProb is missing", () => {
    const { container } = render(<ValueGapBadge rankingP={0.58} marketFairProb={null} />);
    expect(container.querySelector('[data-testid="value-gap-badge"]')).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("renders nothing when rankingP is missing", () => {
    const { container } = render(<ValueGapBadge rankingP={undefined} marketFairProb={0.5} />);
    expect(container.querySelector('[data-testid="value-gap-badge"]')).toBeNull();
  });

  it("never implies profitability — no 'edge' or 'guaranteed' language", () => {
    render(<ValueGapBadge rankingP={0.62} marketFairProb={0.5} />);
    const badge = screen.getByTestId("value-gap-badge");
    const text = badge.textContent ?? "";
    expect(text.toLowerCase()).not.toContain("edge");
    expect(text.toLowerCase()).not.toContain("guarantee");
    expect(text.toLowerCase()).not.toContain("profit");
  });

  it("formats a negative gap with a minus sign, not a bare negative number", () => {
    render(<ValueGapBadge rankingP={0.42} marketFairProb={0.5} />);
    const badge = screen.getByTestId("value-gap-badge");
    expect(badge.textContent).toContain("−8.0pp");
    expect(badge.textContent).not.toContain("-8.0pp"); // ASCII hyphen, not the sign glyph
  });
});
