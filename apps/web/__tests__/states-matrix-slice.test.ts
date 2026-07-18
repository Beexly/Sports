import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * States-matrix pins (task: grandpa-simple states pass). Doctrine under test:
 *
 *   1. A withheld number must READ as deliberately withheld, never broken —
 *      no bare em-dash at headline size (the gated WIN RATE bug).
 *   2. An entitled user with absent data must never see a Pro upsell over it.
 *   3. An outage must never wear the empty state's copy ("no picks exist
 *      yet") or the gated state's copy ("still accruing at 0/N") — outage is
 *      not a verdict, absence is not an outage.
 *   4. Data-heavy routes paint a skeleton, not a blank frame.
 */

const read = (rel: string) =>
  readFileSync(join(__dirname, "..", rel), "utf8");

describe("states matrix — locked/withheld reads deliberate, never broken", () => {
  it("performance Win Rate renders the WithheldStat treatment when below the floor", () => {
    const page = read("app/performance/page.tsx");
    expect(page).toContain("WithheldStat");
    expect(page).toContain("opens at {floor} settled");
    // The withheld branch replaces the bare dash at text-5xl, not the caption dashes.
    expect(page).toMatch(/publishedOverallWinRate !== null \? \(\s*formatPercent/);
  });

  it("pick card: LockedValue only for unentitled; entitled-with-null gets neutral MissingValue", () => {
    const card = read("components/picks/pick-card.tsx");
    expect(card).toMatch(/\{!canSeeConfidence \? \(\s*<LockedValue label="Conf\." \/>/);
    expect(card).toMatch(/\{!canSeeEdgeScore \? \(\s*<LockedValue label="Edge" \/>/);
    expect(card).toContain("function MissingValue()");
    // The missing-data branch must not sell: no pricing link, no Pro label.
    const missing = card.slice(
      card.indexOf("function MissingValue()"),
      card.indexOf("function DataQualityMeter"),
    );
    expect(missing).not.toContain("/pricing");
    expect(missing).not.toContain("Pro");
  });
});

describe("states matrix — outage is not a verdict, absence is not an outage", () => {
  it("/proof separates ledgerUnreachable from the honest empty state", () => {
    const proof = read("app/proof/page.tsx");
    expect(proof).toContain("ledgerUnreachable");
    expect(proof).toContain("proof-unreachable-state");
    // The empty state must be suppressed during an outage.
    expect(proof).toMatch(/picks\.length === 0 && !ledgerUnreachable/);
  });

  it("/clv separates policyUnreachable from the gated accruing state", () => {
    const clv = read("app/clv/page.tsx");
    expect(clv).toContain("policyUnreachable");
    expect(clv).toContain("clv-unreachable-state");
    // Unreachable branch is checked BEFORE the gated fallback.
    expect(clv.indexOf("policyUnreachable ?")).toBeLessThan(clv.indexOf("ClvGatedState"));
  });

  it("calibration panel renders an unreachable card instead of vanishing", () => {
    const panel = read("components/performance/calibration-panel.tsx");
    expect(panel).toContain("calibration-unreachable-state");
    // The old silent-vanish path is gone.
    expect(panel).not.toMatch(/catch \{\s*return null;\s*\}/);
  });

  it("verify console never blames the user's paste for a server fault", () => {
    const console_ = read("components/trust-ledger/verify-console.tsx");
    expect(console_).toMatch(/if \(!r\.ok \|\| body === null\)/);
    expect(console_).toContain("This is not a verdict on the receipt");
  });

  it("browser recompute resets its verdict when the receipt changes", () => {
    // Codex P2 on #75: React reuses the component instance across lookups, so
    // without a reset a previous receipt's MATCH displays for a hash that was
    // never recomputed locally — a false verdict.
    const console_ = read("components/trust-ledger/verify-console.tsx");
    expect(console_).toMatch(
      /useEffect\(\(\) => \{\s*setVerdict\("idle"\);\s*setComputed\(null\);\s*\}, \[preimage, contentHash\]\);/,
    );
  });

  it("browser recompute MATCH under a failed server verdict never reads as healthy", () => {
    // Codex P2 on #75: on column drift the payload/hash pair still recomputes
    // clean, so a bare "MATCH" inside the red integrity-failure branch would
    // contradict the verdict. The failure branch must pass failure context and
    // the match copy there must keep the verdict standing.
    const console_ = read("components/trust-ledger/verify-console.tsx");
    expect(console_).toContain('context="failure"');
    expect(console_).toContain('verdict === "match" && context === "verified"');
    expect(console_).toContain('verdict === "match" && context === "failure"');
    expect(console_).toContain("Digest match, verdict unchanged.");
    expect(console_).toMatch(/this local check does not\s+clear it/);
  });
});

describe("states matrix — loading skeletons on data-heavy routes", () => {
  it.each(["picks", "performance", "clv", "proof", "room/[gameId]", "house", "observatory", "airwave", "dashboard"])(
    "app/%s/loading.tsx exists and uses the house skeleton",
    (route) => {
      const p = join(__dirname, "..", "app", route, "loading.tsx");
      expect(existsSync(p)).toBe(true);
      expect(readFileSync(p, "utf8")).toContain("ToolPageSkeleton");
    },
  );

  it("the force-dynamic game room also carries a segment error boundary with branded chrome", () => {
    const p = join(__dirname, "..", "app", "room", "error.tsx");
    expect(existsSync(p)).toBe(true);
    const src = readFileSync(p, "utf8");
    expect(src).toContain("captureError");
    expect(src).toContain("<Nav />");
    expect(src).toContain("reset()");
  });
});

describe("states matrix — pricing explainer cards never render headed-but-empty", () => {
  it("both explainer paragraphs carry static fallbacks", () => {
    const pricing = read("app/pricing/page.tsx");
    expect(pricing).toMatch(/getFeature\("confidence"\)\?\.customerExplanation \?\?/);
    expect(pricing).toMatch(/getFeature\("no-bet-reasoning"\)\?\.customerExplanation \?\?/);
  });
});
