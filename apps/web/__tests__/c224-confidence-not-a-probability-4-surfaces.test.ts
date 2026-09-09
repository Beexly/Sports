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

  it("the per-bucket 'Expected' framing is relabelled Edge, not a promised rate", () => {
    expect(src).not.toMatch(/Exp \{formatRatioAsPercent/);
    expect(src).toMatch(/Edge \{formatRatioAsPercent/);
  });
});

describe("C-224: app/board/page.tsx", () => {
  const src = read("app/board/page.tsx");

  it("no longer renders calibration.brierScore", () => {
    expect(src).not.toMatch(/calibration\.brierScore/);
    expect(src).not.toMatch(/label="Brier"/);
  });

  it("shows the observed decided win rate with its Clopper-Pearson interval instead", () => {
    expect(src).toMatch(/decidedWinRateLabel/);
    expect(src).toMatch(/headlineClopperPearsonLow/);
    expect(src).toMatch(/headlineClopperPearsonHigh/);
  });
});

describe("C-224: app/fable/proof-dashboard.tsx", () => {
  const src = read("app/fable/proof-dashboard.tsx");

  it("no longer renders the confidence-bucketed 'Public Brier' line", () => {
    expect(src).not.toMatch(/Public Brier/);
    expect(src).not.toMatch(/report\.data\.brierScore/);
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

  it("the bucket table's 'Predicted' column is relabelled Edge level", () => {
    expect(src).not.toMatch(/>\s*Predicted\s*</);
    expect(src).toMatch(/Edge level/);
  });

  it("intro copy reads as a separation claim, not a calibration/probability claim", () => {
    expect(src).toMatch(/leads with separation/);
    expect(src).not.toMatch(/how well confidence numbers\s*\n?\s*matched reality/);
  });
});
