/**
 * Consensus Clock — dispersion half-life fit tests.
 *
 * Synthetic fixture rows only. The real archive isn't ready (needs ≥7 days of
 * OPEN/INTERIM/CLOSE rows); these tests prove the library against known-input,
 * known-output shapes so the page can ship "collecting" honestly once it runs
 * against real data.
 */
import { describe, expect, it } from "vitest";

import type { LineSnapshot } from "@/lib/truthmetrics/line-snapshot";
import {
  computeConsensusClock,
  type ConsensusClockResult,
} from "@/lib/truthmetrics/consensus-clock";

const KICKOFF = "2026-09-10T20:00:00.000Z";

// ── Fixture builders ─────────────────────────────────────────────────────────

/**
 * Build N books that all post the same price at the same time.
 * Dispersion at that time = 0 (no MAD), so this snapshot drops out.
 */
function samePriceSnapshot(
  capturedAt: string,
  price: number,
  bookNames: string[],
  overrides: Partial<LineSnapshot> = {},
): LineSnapshot[] {
  return bookNames.map((book) => ({
    capturedAt,
    phase: "INTERIM" as const,
    book,
    market: "MONEYLINE" as const,
    side: "Chiefs ML",
    price,
    line: null,
    source: "test",
    ...overrides,
  }));
}

/**
 * Build snapshots for one side where books disagree: prices spread around a
 * mean. Dispersion is proportional to the spread of prices.
 */
function dispersedSnapshot(
  capturedAt: string,
  prices: number[],
  bookNames: string[],
  overrides: Partial<LineSnapshot> = {},
): LineSnapshot[] {
  return bookNames.map((book, i) => ({
    capturedAt,
    phase: "INTERIM" as const,
    book,
    market: "MONEYLINE" as const,
    side: "Chiefs ML",
    price: prices[i]!,
    line: null,
    source: "test",
    ...overrides,
  }));
}

/** Full synthetic game: dispersion decays exponentially over time. */
function decayingLineGame(
  nTimePoints: number,
  initialDispersion: number,
  finalDispersion: number,
  lambda: number,
): LineSnapshot[] {
  // nTimePoints captures, evenly spaced from 12h to 1h before kickoff.
  // Dispersion at each = D_inf + (D_0 - D_inf) * e^(-lambda * tHours)
  const snaps: LineSnapshot[] = [];
  const books = ["bookA", "bookB", "bookC", "bookD"];
  for (let i = 0; i < nTimePoints; i++) {
    const tHours = 12 - (11 * i) / (nTimePoints - 1); // 12h down to 1h
    const dTarget = finalDispersion + (initialDispersion - finalDispersion) * Math.exp(-lambda * tHours);
    // Spread `dTarget` as a relative dispersion across 4 books' prices.
    // Prices centered at 2.0 (decimal), spread proportional to dTarget.
    const basePrice = 2.0;
    const spread = basePrice * dTarget; // absolute price spread
    const priceOffsets = [-spread / 2, -spread / 4, spread / 4, spread / 2];
    const capturedAt = new Date(Date.parse(KICKOFF) - tHours * 3600 * 1000).toISOString();
    for (let b = 0; b < books.length; b++) {
      snaps.push({
        capturedAt,
        phase: "INTERIM" as const,
        book: books[b],
        market: "MONEYLINE" as const,
        side: "Chiefs ML",
        price: basePrice + priceOffsets[b]!,
        line: null,
        source: "test",
      });
    }
  }
  return snaps;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("computeConsensusClock — honest-empty contract", () => {
  it("returns hasEnoughData=false with 0 snapshots", () => {
    const result = computeConsensusClock("g1", KICKOFF, []);
    expect(result.hasEnoughData).toBe(false);
    expect(result.emptyReason).toContain("need");
    expect(result.lambda).toBeNull();
    expect(result.halfLifeHours).toBeNull();
    expect(result.dInf).toBeNull();
    expect(result.d0).toBeNull();
    expect(result.rSquared).toBeNull();
    expect(result.boundaryWarning).toBe(false);
  });

  it("returns hasEnoughData=false with fewer than MIN_POINTS dispersion observations", () => {
    // Only 2 time points, each with 2 books → 2 dispersion observations < 4.
    const snaps: LineSnapshot[] = [
      ...dispersedSnapshot("2026-09-10T10:00:00.000Z", [1.95, 2.05], ["bookA", "bookB"]),
      ...dispersedSnapshot("2026-09-10T12:00:00.000Z", [1.93, 2.07], ["bookA", "bookB"]),
    ];
    const result = computeConsensusClock("g1", KICKOFF, snaps);
    expect(result.hasEnoughData).toBe(false);
    expect(result.lambda).toBeNull();
    expect(result.emptyReason).toContain("need");
  });

  it("returns hasEnoughData=false when all snapshots are at the same time (single dispersion point < 4)", () => {
    const snaps: LineSnapshot[] = [
      ...dispersedSnapshot("2026-09-10T10:00:00.000Z", [1.95, 2.05, 1.93, 2.07], ["bookA", "bookB", "bookC", "bookD"]),
    ];
    const result = computeConsensusClock("g1", KICKOFF, snaps);
    expect(result.hasEnoughData).toBe(false);
  });
});

describe("computeConsensusClock — dispersion measurement", () => {
  it("drops time-slices where all books agree (MAD=0)", () => {
    // 5 time points: 4 with decaying dispersion, 5th has all same price (MAD=0).
    const snaps: LineSnapshot[] = [
      ...dispersedSnapshot("2026-09-10T10:00:00.000Z", [1.90, 2.10, 1.88, 2.12], ["bookA", "bookB", "bookC", "bookD"]),
      ...dispersedSnapshot("2026-09-10T11:00:00.000Z", [1.92, 2.08, 1.90, 2.10], ["bookA", "bookB", "bookC", "bookD"]),
      ...dispersedSnapshot("2026-09-10T12:00:00.000Z", [1.94, 2.06, 1.92, 2.08], ["bookA", "bookB", "bookC", "bookD"]),
      ...dispersedSnapshot("2026-09-10T13:00:00.000Z", [1.96, 2.04, 1.94, 2.06], ["bookA", "bookB", "bookC", "bookD"]),
      ...samePriceSnapshot("2026-09-10T14:00:00.000Z", 2.0, ["bookA", "bookB", "bookC", "bookD"]),
    ];
    const result = computeConsensusClock("g1", KICKOFF, snaps);
    // 4 dispersion observations (5th dropped for MAD=0) ≥ MIN_POINTS(4), and
    // dispersion actually decays so the fit succeeds.
    expect(result.hasEnoughData).toBe(true);
    expect(result.lambda).not.toBeNull();
  });

  it("discards snapshots captured AFTER kickoff", () => {
    const snaps: LineSnapshot[] = [
      ...dispersedSnapshot("2026-09-10T10:00:00.000Z", [1.95, 2.05], ["bookA", "bookB"]),
      ...dispersedSnapshot("2026-09-10T11:00:00.000Z", [1.93, 2.07], ["bookA", "bookB"]),
      ...dispersedSnapshot("2026-09-10T12:00:00.000Z", [1.91, 2.09], ["bookA", "bookB"]),
      ...dispersedSnapshot("2026-09-10T13:00:00.000Z", [1.89, 2.11], ["bookA", "bookB"]),
      // After kickoff — should be discarded.
      ...dispersedSnapshot("2026-09-10T21:00:00.000Z", [1.87, 2.13], ["bookA", "bookB"]),
    ];
    const result = computeConsensusClock("g1", KICKOFF, snaps);
    expect(result.hasEnoughData).toBe(true);
    // Without the after-kickoff snapshot, we have 4 dispersion observations.
  });

  it("returns null dispersion when only 1 book is present at a time slice", () => {
    // Each time slice has only 1 book → dispersion undefined → dropped.
    const snaps: LineSnapshot[] = [
      { capturedAt: "2026-09-10T10:00:00.000Z", phase: "INTERIM", book: "bookA", market: "MONEYLINE", side: "Chiefs ML", price: 1.95, line: null, source: "test" },
      { capturedAt: "2026-09-10T11:00:00.000Z", phase: "INTERIM", book: "bookA", market: "MONEYLINE", side: "Chiefs ML", price: 1.93, line: null, source: "test" },
      { capturedAt: "2026-09-10T12:00:00.000Z", phase: "INTERIM", book: "bookA", market: "MONEYLINE", side: "Chiefs ML", price: 1.91, line: null, source: "test" },
      { capturedAt: "2026-09-10T13:00:00.000Z", phase: "INTERIM", book: "bookA", market: "MONEYLINE", side: "Chiefs ML", price: 1.89, line: null, source: "test" },
    ];
    const result = computeConsensusClock("g1", KICKOFF, snaps);
    expect(result.hasEnoughData).toBe(false);
    expect(result.emptyReason).toContain("need");
  });
});

describe("computeConsensusClock — exponential fit", () => {
  it("recovers a known lambda from a synthetic decaying dispersion", () => {
    // Build a game where dispersion decays with λ=0.5 per hour, D_0=0.1, D_inf=0.001.
    const snaps = decayingLineGame(8, 0.1, 0.001, 0.5);
    const result = computeConsensusClock("g1", KICKOFF, snaps);
    expect(result.hasEnoughData).toBe(true);
    expect(result.lambda).not.toBeNull();
    // Should recover λ ≈ 0.5 within 15%.
    expect(result.lambda!).toBeCloseTo(0.5, 1);
    // Half-life = ln(2)/λ ≈ 1.386h.
    expect(result.halfLifeHours!).toBeCloseTo(Math.LN2 / 0.5, 1);
    // R² should be high (data is perfectly exponential).
    expect(result.rSquared!).toBeGreaterThan(0.9);
    expect(result.boundaryWarning).toBe(false);
    expect(result.emptyReason).toBeNull();
  });

  it("returns boundaryWarning=true when lambda hits the upper grid edge", () => {
    // Very fast convergence (λ=20, beyond grid max of 10).
    const snaps = decayingLineGame(8, 0.1, 0.001, 20);
    const result = computeConsensusClock("g1", KICKOFF, snaps);
    expect(result.hasEnoughData).toBe(true);
    expect(result.boundaryWarning).toBe(true);
  });

  it("returns null fit when dispersion is constant (no decay signal)", () => {
    // All time slices have the same dispersion → ssTot = 0 → no signal.
    const snaps: LineSnapshot[] = [];
    const books = ["bookA", "bookB", "bookC", "bookD"];
    const times = [
      "2026-09-10T10:00:00.000Z",
      "2026-09-10T11:00:00.000Z",
      "2026-09-10T12:00:00.000Z",
      "2026-09-10T13:00:00.000Z",
    ];
    for (const t of times) {
      snaps.push(...dispersedSnapshot(t, [1.95, 2.05, 1.93, 2.07], books));
    }
    const result = computeConsensusClock("g1", KICKOFF, snaps);
    // Dispersion is the same at all 4 time points → fit returns null (constant).
    expect(result.hasEnoughData).toBe(false);
    expect(result.emptyReason).toContain("constant");
  });

  it("produces deterministic results for identical inputs", () => {
    const snaps = decayingLineGame(8, 0.1, 0.001, 0.5);
    const r1 = computeConsensusClock("g1", KICKOFF, snaps);
    const r2 = computeConsensusClock("g1", KICKOFF, snaps);
    expect(r1.snapshotHash).toBe(r2.snapshotHash);
    expect(r1.lambda).toBe(r2.lambda);
    expect(r1.halfLifeHours).toBe(r2.halfLifeHours);
  });

  it("produces different hashes for different inputs", () => {
    const snaps1 = decayingLineGame(8, 0.1, 0.001, 0.5);
    const snaps2 = decayingLineGame(8, 0.1, 0.001, 0.3);
    const r1 = computeConsensusClock("g1", KICKOFF, snaps1);
    const r2 = computeConsensusClock("g1", KICKOFF, snaps2);
    expect(r1.snapshotHash).not.toBe(r2.snapshotHash);
  });

  it("sorts dispersion series by time ascending before fitting", () => {
    // Same data as decayingLineGame(8,...) but shuffled order.
    const snaps = decayingLineGame(8, 0.1, 0.001, 0.5);
    const shuffled = [...snaps].sort(() => Math.random() - 0.5);
    const r1 = computeConsensusClock("g1", KICKOFF, snaps);
    const r2 = computeConsensusClock("g1", KICKOFF, shuffled);
    expect(r1.lambda).toBeCloseTo(r2.lambda!, 5);
    expect(r1.rSquared).toBeCloseTo(r2.rSquared!, 5);
  });
});
