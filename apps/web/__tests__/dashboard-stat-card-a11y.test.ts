import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * /dashboard StatCard accessibility contract.
 *
 * The customer's headline numbers (Today's Picks / Verified Record /
 * Win Rate / Tier) are rendered via the inline `StatCard` component.
 * Each card has a label and a value. Pin the rendered structure so
 * a future refactor doesn't strip the label-value relationship that
 * screen readers rely on.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "app/dashboard/page.tsx"), "utf8");

describe("/dashboard StatCard a11y", () => {
  it("renders all four headline StatCards", () => {
    for (const label of ["Today's Picks", "Verified Record", "Win Rate", "Tier"]) {
      expect(src, `StatCard label missing: ${label}`).toContain(label);
    }
  });

  it("StatCard component definition exists with label/value props", () => {
    expect(src).toMatch(/function StatCard[\s\S]{0,400}label:\s*string[\s\S]{0,200}value:\s*string/);
  });

  it("each StatCard wraps the label in a <p> directly above the value <p>", () => {
    // The component's render uses `<p>{label}</p>` then `<p ...>{value}</p>`.
    expect(src).toMatch(/<p[^>]*>\{label\}<\/p>[\s\S]{0,200}<p[^>]*>\{value\}<\/p>/);
  });
});
