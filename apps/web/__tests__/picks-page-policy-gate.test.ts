import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * /picks page — policy-gate contract.
 *
 * /picks is the highest-trafficked customer surface for picks. It MUST:
 *   1. Show the sample-data banner whenever demoActive (stubMode &&
 *      DEMO_PICKS_ENABLED), gated on `demoActive`.
 *   2. State the trust disclaimer inside the banner ("never settle",
 *      "never count toward a verified record", "no win-rate claim").
 *   3. Have a `sample-data-banner-picks` data-testid so the
 *      sample-mode-ui and demo-active-contract tests can assert it.
 *   4. NOT render any unconditional record / win-rate / accuracy text
 *      anywhere outside that banner — the policy gate is the only path
 *      to a numeric performance claim.
 *
 * Source-level test only.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "app/picks/page.tsx"), "utf8");

describe("/picks policy-gate contract", () => {
  it("derives demoActive from isStubMode() && isDemoPicksEnabled()", () => {
    expect(src).toMatch(/isStubMode/);
    expect(src).toMatch(/isDemoPicksEnabled/);
    expect(src).toMatch(/demoActive\s*=\s*isStubMode\(\)\s*&&\s*isDemoPicksEnabled\(\)/);
  });

  it("renders the sample-data banner only when demoActive is true", () => {
    expect(src).toMatch(/\{demoActive\s*&&\s*\(/);
    expect(src).toMatch(/data-testid="sample-data-banner-picks"/);
  });

  it("uses ARIA role/aria-live so screen readers announce the banner", () => {
    // Same line as the banner so we know the attributes are on the right element.
    const bannerLine = src.split("\n").find((l) => l.includes("sample-data-banner-picks")) ?? "";
    expect(bannerLine).toMatch(/role="status"/);
    expect(bannerLine).toMatch(/aria-live="polite"/);
  });

  it("the banner carries the full trust disclaimer (samples + no record + no win-rate)", () => {
    // Find the banner block.
    const start = src.indexOf("sample-data-banner-picks");
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf("</div>", start);
    const block = src.slice(start, end);
    expect(block).toMatch(/deterministic samples/i);
    expect(block).toMatch(/never settle/i);
    expect(block).toMatch(/verified record/i);
    expect(block).toMatch(/no win-rate claim/i);
  });

  it("never hardcodes a win-rate / record claim outside the banner", () => {
    // Strip the banner, then assert nothing claims a number-shaped record.
    const stripped = src.replace(
      /\{demoActive\s*&&[\s\S]*?<\/div>\s*\)\}/,
      "",
    );
    // Patterns that would be policy violations: "Win rate: X%", "Record: W-L",
    // "X% accuracy", "we hit Y%".
    expect(stripped).not.toMatch(/win\s*rate\s*:\s*\d/i);
    expect(stripped).not.toMatch(/we\s+hit\s+\d{1,3}\s*%/i);
    expect(stripped).not.toMatch(/record\s*:\s*\d+\s*-\s*\d+/i);
    expect(stripped).not.toMatch(/\b\d{1,3}\s*%\s+(?:win|accuracy|hit)\s+rate/i);
  });

  it("uses /api/picks as the picks data source (not a fabricated list)", () => {
    expect(src).toMatch(/\/api\/picks/);
    expect(src).toMatch(/fetchPicks/);
  });

  it("surfaces in-content trust context near the paywall", () => {
    expect(src).toMatch(/import\s+\{\s*RiskDisclosure\s*\}/);
    expect(src).toMatch(/<PicksTrustStrip\s*\/>/);
    expect(src).toMatch(/data-testid="picks-trust-strip"/);
    expect(src).toMatch(/<RiskDisclosure[\s\S]{0,120}variant="card"/);
    expect(src).toMatch(/<RiskDisclosure[\s\S]{0,160}includePastPerformance/);
    expect(src).toMatch(/href="\/methodology"[\s\S]{0,300}Read methodology/);
  });

  it("renders no PickCard array literal that would imply fake fixtures", () => {
    // Real picks flow through fetchPicks → PicksResponse.data. There must
    // not be a JSX array literal mounting hardcoded picks.
    expect(src).not.toMatch(/picks\s*=\s*\[\s*\{/);
  });
});
