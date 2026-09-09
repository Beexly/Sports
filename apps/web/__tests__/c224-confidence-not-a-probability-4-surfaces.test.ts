import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * C-224: confidence is an Edge Index, not a probability, on four public
 * surfaces that still scored/rendered it as one after proof-explorer.tsx
 * was fixed in PR #720:
 *
 *   - components/observatory/scoring-reliability-panel.tsx
 *   - app/board/page.tsx
 *   - app/fable/proof-dashboard.tsx
 *   - app/glass-ledger/page.tsx
 *
 * Mirrors proof-explorer's approach: drop the Brier/"predicted probability"
 * framing, keep separation reads, band/bucket counts, and (where available)
 * the observed decided win rate with its interval — never renaming a number
 * into a claim it does not support.
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("C-224: scoring-reliability-panel.tsx", () => {
  const src = read("components/observatory/scoring-reliability-panel.tsx");

  it("no longer imports or renders formatBrier / a Brier stat tile", () => {
    expect(src).not.toMatch(/formatBrier/);
    expect(src).not.toMatch(/label:\s*"Brier"/);
  });

  it("still shows a bucket/band count in its place", () => {
    expect(src).toMatch(/label:\s*"Buckets"/);
  });

  it("the per-bucket confidence-vs-observed comparison is removed, not relabelled (Devin finding, PR #737)", () => {
    // A first pass just renamed "Exp" to "Edge" — Devin Review correctly
    // flagged that the comparison itself (confidence bar next to observed
    // bar, ECE, max gap, per-bucket ✕gap✕) was still probability-scoring
    // framing regardless of the label. All of it is gone now; only the real,
    // gated observed rate remains.
    expect(src).not.toMatch(/Exp \{formatRatioAsPercent/);
    expect(src).not.toMatch(/Edge \{formatRatioAsPercent/);
    expect(src).not.toMatch(/expectedWinRate/);
    expect(src).not.toMatch(/absoluteGap/);
    expect(src).not.toMatch(/label:\s*"ECE"/);
    expect(src).not.toMatch(/label:\s*"Max gap"/);
    expect(src).toMatch(/Obs \{formatRatioAsPercent\(point\.observedWinRate\)\}/);
  });
});

describe("C-224: app/board/page.tsx", () => {
  const src = read("app/board/page.tsx");

  it("no longer renders calibration.brierScore", () => {
    expect(src).not.toMatch(/calibration\.brierScore/);
    expect(src).not.toMatch(/label="Brier"/);
  });

  it("does not render a win rate at all — reserved for the governed CLV headline policy", () => {
    // lib/performance/public-performance-policy.ts: win rate is deliberately
    // not a member of the public headline type, so this page must not
    // construct one on its own path. A settled-picks count replaces the
    // removed Brier tile instead — a fact, not a performance claim.
    expect(src).not.toMatch(/decidedWinRateLabel/);
    expect(src).not.toMatch(/headlineClopperPearsonLow/);
    expect(src).toMatch(/label="Decided" value=\{String\(calibration\.population\.decided\)\}/);
  });
});

describe("C-224: app/fable/proof-dashboard.tsx", () => {
  const src = read("app/fable/proof-dashboard.tsx");

  it("no longer renders the confidence-bucketed 'Public Brier' line", () => {
    expect(src).not.toMatch(/Public Brier/);
    expect(src).not.toMatch(/report\.data\.brierScore/);
  });

  it("ReliabilityCurve no longer marks where expectedWinRate (confidence) would land (Devin finding, PR #737)", () => {
    expect(src).not.toMatch(/bucket\.expectedWinRate/);
  });

  it("keeps the real, durable, market-anchored Murphy/BSS metrics untouched", () => {
    // These come from loadLatestCalibrationMetrics (the durable artifact),
    // not the confidence-bucketed public calibration report — a genuinely
    // different, legitimate measurement this fix must not remove.
    expect(src).toMatch(/label="REL"/);
    expect(src).toMatch(/label="RES"/);
    expect(src).toMatch(/label="UNC"/);
    expect(src).toMatch(/BSS vs base rate/);
  });
});

describe("C-224: app/glass-ledger/page.tsx", () => {
  const src = read("app/glass-ledger/page.tsx");

  it("no longer renders a Brier score tile or 'predicted vs settled' framing", () => {
    expect(src).not.toMatch(/Brier score/);
    expect(src).not.toMatch(/calibration\?\.brierScore/);
  });

  it("the bucket table's predicted-vs-observed column is removed, not relabelled (Devin finding, PR #737)", () => {
    // A first pass relabelled the "Predicted" column "Edge level" — Devin
    // Review correctly flagged that a side-by-side column next to Observed
    // still reads as a predicted-vs-actual table structurally, whatever the
    // header says. Dropped instead of relabelled.
    expect(src).not.toMatch(/>\s*Predicted\s*</);
    expect(src).not.toMatch(/Edge level/);
    expect(src).not.toMatch(/bucket\.predicted/);
  });

  it("intro copy reads as a separation claim, not a calibration/probability claim", () => {
    expect(src).toMatch(/leads with separation/);
    expect(src).not.toMatch(/how well confidence numbers\s*\n?\s*matched reality/);
  });
});
