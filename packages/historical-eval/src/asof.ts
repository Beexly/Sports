import type { HistCalibrationRow, HistOddsQuote } from "./types.js";

export class LeakageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeakageError";
  }
}

export function filterCalibrationAsOf(
  rows: readonly HistCalibrationRow[],
  t: Date,
): HistCalibrationRow[] {
  const tMs = t.getTime();
  return rows.filter((r) => r.decisionTime.getTime() < tMs);
}

export function assertQuoteAsOf(quote: HistOddsQuote, t: Date): void {
  if (quote.fetchedAt.getTime() > t.getTime()) {
    throw new LeakageError(
      `odds fetchedAt ${quote.fetchedAt.toISOString()} > decision ${t.toISOString()}`,
    );
  }
}

export function selectQuoteAsOf(
  timeline: readonly HistOddsQuote[],
  t: Date,
): HistOddsQuote | null {
  const tMs = t.getTime();
  let best: HistOddsQuote | null = null;
  for (const q of timeline) {
    if (q.fetchedAt.getTime() <= tMs) {
      if (!best || q.fetchedAt.getTime() > best.fetchedAt.getTime()) best = q;
    }
  }
  return best;
}

export function assertProb(q: number, name = "q"): void {
  if (!(q > 0 && q < 1) || !Number.isFinite(q)) {
    throw new LeakageError(`${name} out of range: ${q}`);
  }
}
