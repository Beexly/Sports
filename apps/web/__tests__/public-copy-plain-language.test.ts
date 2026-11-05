import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MARKET_IMPLIED_CALIBRATION_CLAIM } from "@/lib/picks/market-implied-display";

/**
 * FE-10 / FE-15 / C-107 copy contracts (plan LAUNCH_FINISH_LINE_2026-09-05
 * section 5, FE table).
 *
 *   FE-10: /board and /picks explain a closed board in plain language; no
 *          internal gate jargon; timeLabel never invents "Just now"; the
 *          public board row does not render the ranking sort key.
 *   FE-15: FAQ and About match the paywall (factor trail and confidence are
 *          Pro/Elite; Free gets the two-pick teaser without confidence) and the
 *          "64% calibrated" illustration is gone.
 *   C-107: the public calibration claim is restated with the MONEYLINE-only
 *          scope wherever the old confidence-calibration wording appeared.
 *
 * Source-level: these are server components that need Prisma + auth to render.
 */
const root = resolve(__dirname, "..");
const read = (p: string): string => readFileSync(resolve(root, p), "utf8");

const board = read("app/board/page.tsx");
const picks = read("app/picks/page.tsx");
const faq = read("app/faq/page.tsx");
const about = read("app/about/page.tsx");
const tout = read("app/vs/tout-services/page.tsx");
const pricing = read("app/pricing/page.tsx");
const featureGates = read("lib/pricing/feature-gates.ts");
const calibration = read("app/calibration/page.tsx");

const JARGON = /LIVE_BOARD|Just now|refuse-default|gate held by law|founder enable/;

describe("FE-10: /board and /picks speak plainly (sealed-era design)", () => {
  // Shipped design (founder doctrine 2026-10-29): the public web UI serves
  // ONLY GALAXY PICKS (PAID) (/packages) and DFS (/fantasy/dfs). /board is
  // an under-construction stub that redirects there; /picks renders the
  // Week 8 sealed card only. Neither renders a live board, a timestamp, or
  // ranking internals, so the pre-sealed "board is closed" copy and the
  // timeLabel helper are gone by design — these pins assert the shipped
  // plain-language redirect instead.
  it("carries none of the internal gate jargon", () => {
    expect(board).not.toMatch(JARGON);
    expect(picks).not.toMatch(JARGON);
  });

  it("/board says it is under construction and points at Galaxy Picks and DFS", () => {
    expect(board).toContain("under construction");
    expect(board).toContain('href="/packages"');
    expect(board).toContain('href="/fantasy/dfs"');
    expect(board).toContain('data-testid="under-construction-notice"');
  });

  it("/picks renders the sealed card only, in plain language", () => {
    expect(picks).toContain("16-5");
    expect(picks).toContain('href="/packages"');
    expect(picks).toMatch(/publishAllowed/);
  });

  it("/board renders no timestamp and never invents 'Just now'", () => {
    expect(board).not.toMatch(/timeLabel/);
    expect(board).not.toMatch(/Just now/);
    expect(board).not.toMatch(/getTime/);
  });

  it("the public board does not render rankingP or rankingSource", () => {
    expect(board).not.toMatch(/rankingP/);
    expect(board).not.toMatch(/rankingSource/);
  });
});

describe("FE-15: FAQ and About match the paywall", () => {
  it("drops the false 'that's the whole product' answer", () => {
    expect(faq).not.toMatch(/that's the whole product/i);
    expect(about).not.toMatch(/that's the whole product/i);
  });

  it("states that the factor trail is Pro and Elite and Free gets the teaser without confidence", () => {
    expect(faq).toContain("On Pro and Elite, yes.");
    expect(faq).toMatch(/without the confidence rating or the factor trail/);
    expect(about).toContain("On Pro and Elite, each pick exposes its factor breakdown");
    expect(about).toMatch(/Free sees the daily two-pick teaser without the confidence score/);
  });

  it("replaces the 64% illustration with a tier-neutral sentence and no percentage", () => {
    for (const src of [faq, about, tout]) {
      expect(src).not.toMatch(/64% calibrated/);
    }
    const principles = about.slice(about.indexOf("const PRINCIPLES"), about.indexOf("export default function AboutPage"));
    expect(principles).not.toMatch(/\d+%/);
    expect(principles).toContain("on every tier");
  });
});

describe("C-107: the public calibration claim is MONEYLINE-scoped", () => {
  it("the claim sentence itself carries the scope and keeps confidence off the chart", () => {
    expect(MARKET_IMPLIED_CALIBRATION_CLAIM).toContain("settled two-way moneyline picks");
    expect(MARKET_IMPLIED_CALIBRATION_CLAIM).toContain("Confidence is a ranking score");
  });

  it("is rendered on /about from the single constant (/calibration is a stub)", () => {
    expect(about).toContain("MARKET_IMPLIED_CALIBRATION_CLAIM");
    // /calibration shipped as an under-construction stub redirecting to
    // Galaxy Picks and DFS, so it renders no calibration claim at all.
    expect(calibration).not.toContain("MARKET_IMPLIED_CALIBRATION_CLAIM");
    expect(calibration).not.toContain('data-testid="calibration-claim-scope"');
    expect(calibration).toContain('data-testid="under-construction-notice"');
  });

  it("/calibration renders no interactive chart and no chart-basis claim", () => {
    // The stub renders no ProofExplorer and no confidence-bucketed chart, so
    // there is no chart to misread as the market-implied measurement.
    expect(calibration).not.toContain('data-testid="calibration-chart-basis"');
    expect(calibration).not.toContain("groups settled picks by confidence score");
    expect(calibration).not.toContain("not the market-implied measurement");
    expect(calibration).toContain('href="/packages"');
    expect(calibration).toContain('href="/fantasy/dfs"');
  });

  it("no public copy still calls confidence a calibrated number", () => {
    expect(pricing).not.toMatch(/calibrated against every settled result/);
    expect(featureGates).not.toMatch(/How well Galaxy's confidence has matched/);
    expect(about).not.toMatch(/calibration is measured against settled results/);
  });
});
