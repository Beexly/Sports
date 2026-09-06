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

describe("FE-10: /board and /picks speak plainly about a closed board", () => {
  it("carries none of the internal gate jargon", () => {
    expect(board).not.toMatch(JARGON);
    expect(picks).not.toMatch(JARGON);
  });

  it("says the board is closed until the data checks pass", () => {
    expect(board).toContain("The board is closed until the data checks pass.");
    expect(picks).toContain("The board is closed until the data checks pass.");
  });

  it("timeLabel returns Unavailable for an unparseable timestamp", () => {
    expect(board).toMatch(/if \(Number\.isNaN\(date\.getTime\(\)\)\) return "Unavailable";/);
  });

  it("the public board row does not render rankingP or rankingSource", () => {
    const rowItem = board.slice(board.indexOf("function BoardRowItem("));
    expect(rowItem).not.toMatch(/row\.rankingP/);
    expect(rowItem).not.toMatch(/row\.rankingSource/);
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

  it("is rendered on /about and /calibration from the single constant", () => {
    expect(about).toContain("MARKET_IMPLIED_CALIBRATION_CLAIM");
    expect(calibration).toContain("MARKET_IMPLIED_CALIBRATION_CLAIM");
    expect(calibration).toContain('data-testid="calibration-claim-scope"');
  });

  it("/calibration says the interactive chart is confidence-bucketed, not the market-implied measurement", () => {
    // The ProofExplorer directly under the claim buckets by pick.confidence
    // (lib/calibration/report.ts); without this caption a reader would take
    // it for "that measurement".
    expect(calibration).toContain('data-testid="calibration-chart-basis"');
    expect(calibration).toContain("groups settled picks by confidence score");
    expect(calibration).toContain("not the market-implied measurement");
  });

  it("no public copy still calls confidence a calibrated number", () => {
    expect(pricing).not.toMatch(/calibrated against every settled result/);
    expect(featureGates).not.toMatch(/How well Galaxy's confidence has matched/);
    expect(about).not.toMatch(/calibration is measured against settled results/);
  });
});
