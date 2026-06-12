import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * PickCard renders confidence / edge / data-quality as bare numbers and a
 * colored bar. Those carry no meaning for screen-reader users without an
 * explicit label. This locks in the accessible names.
 */
const repoRoot = resolve(__dirname, "..", "..", "..");
const src = readFileSync(
  resolve(repoRoot, "apps/web/components/picks/pick-card.tsx"),
  "utf8"
);

describe("PickCard accessibility labels", () => {
  it("gives the confidence, edge, and data-quality metrics screen-reader labels", () => {
    expect(src).toMatch(/aria-label=\{`Model confidence:/);
    expect(src).toMatch(/aria-label=\{`Edge score:/);
    expect(src).toMatch(/aria-label=\{`Data quality:/);
  });

  it("marks the decorative data-quality bar track as aria-hidden", () => {
    expect(src).toContain('aria-hidden="true"');
  });

  it("does not use low-contrast gray text for small pick-card copy", () => {
    expect(src).not.toMatch(/text-gray-(500|600)\b/);
  });

  it("uses brand tokens for card chrome — no raw tailwind gray-* utilities", () => {
    expect(src).not.toMatch(/(?:text|bg|border)-gray-\d+/);
  });

  it("gives win/loss/push/void results a non-color glyph cue (WCAG 1.4.1)", () => {
    expect(src).toMatch(/WIN:\s*"✓"/);
    expect(src).toMatch(/LOSS:\s*"✕"/);
    expect(src).toMatch(/PUSH:\s*"–"/);
    expect(src).toMatch(/VOID:\s*"∅"/);
  });

  it("marks factor impact direction with a +/−/· glyph, not color alone", () => {
    expect(src).toMatch(/"positive" \? "\+" : factor\.impact === "negative" \? "−" : "·"/);
  });
});
