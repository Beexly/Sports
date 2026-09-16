/**
 * C-352 — /performance judged at 52.4% in two lanes.
 *
 * DoD:
 *  - VerdictLine threshold={0.524} (not the 0.5 default)
 *  - Lanes split on bookmakerCount >= 1 (book-priced) vs 0 (model signal)
 *  - Both lanes rendered with W/L/rate/n
 *  - model-signal rows stay in the record
 *  - coverage line "n of N settled rows carry a stored price"
 *
 * Source-level pins (the page is a server component over Prisma; rendering it
 * end-to-end would need a DB mock of the whole summary table). The pure lane
 * math is unit-tested here against the AGENTS.md 2026-09-14 audit numbers so
 * the split itself is executable, not just grepped.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildPerformanceSummaries,
  decodeLaneModelVersion,
  type SummaryPickRow,
} from "@/lib/performance/build-performance-summaries";
import { winRatePct } from "@/lib/format/stat";
import { wilsonInterval } from "@/lib/performance/wilson-interval";

const pageSource = readFileSync(
  resolve(__dirname, "..", "app", "performance", "page.tsx"),
  "utf8",
);
const rebuildSource = readFileSync(
  resolve(__dirname, "..", "lib", "performance", "rebuild-performance-summaries.ts"),
  "utf8",
);

const KICKOFF = new Date("2026-09-10T23:00:00Z");

function settled(
  result: "WIN" | "LOSS",
  bookmakerCount: number,
): SummaryPickRow {
  return {
    sport: "baseball_mlb",
    pickType: "MONEYLINE",
    tier: "A",
    modelVersion: "v5.2.7",
    result,
    settledAt: new Date("2026-09-11T02:00:00Z"),
    generatedAt: new Date("2026-09-10T12:00:00Z"),
    commenceTime: KICKOFF,
    bookmakerCount,
  };
}

/** AGENTS.md 2026-09-14 audit lane counts (measured, not invented). */
const BOOK_W = 745;
const BOOK_L = 777;
const SIGNAL_W = 470;
const SIGNAL_L = 292;

function auditPopulation(): SummaryPickRow[] {
  const rows: SummaryPickRow[] = [];
  for (let i = 0; i < BOOK_W; i++) rows.push(settled("WIN", 8));
  for (let i = 0; i < BOOK_L; i++) rows.push(settled("LOSS", 8));
  for (let i = 0; i < SIGNAL_W; i++) rows.push(settled("WIN", 0));
  for (let i = 0; i < SIGNAL_L; i++) rows.push(settled("LOSS", 0));
  return rows;
}

function laneTotals(builtRows: readonly { modelVersion: string; wins: number; losses: number; totalPicks: number; period: string }[]) {
  const all = builtRows.filter((r) => r.period === "all-time");
  const book = all.filter((r) => decodeLaneModelVersion(r.modelVersion).lane === "book-priced");
  const signal = all.filter((r) => decodeLaneModelVersion(r.modelVersion).lane === "model-signal");
  const sum = (rows: typeof all) =>
    rows.reduce(
      (acc, r) => ({
        wins: acc.wins + r.wins,
        losses: acc.losses + r.losses,
        totalPicks: acc.totalPicks + r.totalPicks,
      }),
      { wins: 0, losses: 0, totalPicks: 0 },
    );
  return { book: sum(book), signal: sum(signal) };
}

describe("C-352 page wiring (source-level)", () => {
  it("passes threshold={0.524} to VerdictLine — never the 0.5 default", () => {
    expect(pageSource).toMatch(/<VerdictLine[\s\S]*?threshold=\{BREAKEVEN_THRESHOLD\}/);
    expect(pageSource).toMatch(/BREAKEVEN_THRESHOLD\s*=\s*0\.524/);
  });

  it("renders BOTH lanes with their own testids", () => {
    expect(pageSource).toContain('data-testid="performance-book-priced-lane"');
    expect(pageSource).toContain('data-testid="performance-model-signal-lane"');
  });

  it("labels the model-signal lane not bettable and keeps it out of the hero aggregate", () => {
    expect(pageSource).toMatch(/not bettable/i);
    // Hero wins/losses come from bookOverall, not a summed overall.
    expect(pageSource).toMatch(/wins=\{bookOverall\.wins\}/);
    expect(pageSource).toMatch(/losses=\{bookOverall\.losses\}/);
    expect(pageSource).not.toMatch(/wins=\{overall\.wins\}/);
    expect(pageSource).not.toMatch(/losses=\{overall\.losses\}/);
  });

  it("publishes the coverage line from the two lane totals", () => {
    expect(pageSource).toContain('data-testid="performance-coverage-line"');
    expect(pageSource).toMatch(/settled rows carry a stored price/);
    expect(pageSource).toMatch(/storedPriceN/);
    expect(pageSource).toMatch(/settledRecordN/);
  });

  it("shows the Wilson band beside the 52.4% break-even on the book-priced hero", () => {
    expect(pageSource).toMatch(/bookWilsonBand/);
    expect(pageSource).toContain("52.4%");
  });
});

describe("C-352 rebuild selects bookmakerCount (source-level)", () => {
  it("the rebuild query selects bookmakerCount or every row collapses into model-signal", () => {
    expect(rebuildSource).toMatch(/bookmakerCount:\s*true/);
  });
});

describe("C-352 lane math on the AGENTS.md audit population (executable)", () => {
  it("splits 745-777 book-priced and 470-292 model-signal; signal stays in the record", () => {
    const built = buildPerformanceSummaries(auditPopulation());
    const { book, signal } = laneTotals(built.rows);

    expect(book).toEqual({ wins: BOOK_W, losses: BOOK_L, totalPicks: BOOK_W + BOOK_L });
    expect(signal).toEqual({ wins: SIGNAL_W, losses: SIGNAL_L, totalPicks: SIGNAL_W + SIGNAL_L });

    // model-signal rows stay in the record — not dropped, not folded into book.
    const allRecord = built.rows
      .filter((r) => r.period === "all-time")
      .reduce((a, r) => a + r.totalPicks, 0);
    expect(allRecord).toBe(BOOK_W + BOOK_L + SIGNAL_W + SIGNAL_L);
  });

  it("headline win rate is the BOOK lane only — never the summed 53.2%", () => {
    const built = buildPerformanceSummaries(auditPopulation());
    const { book, signal } = laneTotals(built.rows);

    const bookRate = winRatePct(book.wins, book.losses)!;
    const summedRate = winRatePct(book.wins + signal.wins, book.losses + signal.losses)!;

    // Measured from the audit table: 745/(745+777) = 48.947…% → 48.9%
    expect(bookRate.toFixed(1)).toBe("48.9");
    // The lying headline the audit found: 1215/2284 = 53.2%
    expect(summedRate.toFixed(1)).toBe("53.2");
    // Model-signal must not lift the published lane above break-even.
    expect(bookRate).toBeLessThan(52.4);
    expect(summedRate).toBeGreaterThan(52.4);
  });

  it("coverage is book n of settled N — 1522 of 2284 on the audit population", () => {
    const built = buildPerformanceSummaries(auditPopulation());
    const { book, signal } = laneTotals(built.rows);
    const storedPriceN = book.totalPicks;
    const settledRecordN = book.totalPicks + signal.totalPicks;
    expect(storedPriceN).toBe(1522);
    expect(settledRecordN).toBe(2284);
  });

  it("the book-priced Wilson lower bound does not clear 52.4% on the audit lane", () => {
    const band = wilsonInterval(BOOK_W, BOOK_W + BOOK_L)!;
    expect(band.low).toBeLessThan(0.524);
    // So D22 withholds the verdict word — VerdictLine will not print Conclusive.
  });
});
