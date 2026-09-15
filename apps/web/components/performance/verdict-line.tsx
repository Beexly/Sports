/**
 * VerdictLine — the interval gets a vote on the public calibration report.
 *
 * C-352 / D22: the verdict WORD ("Conclusive") renders only when the interval's
 * LOWER bound clears the threshold. A band that straddles it, or lies entirely
 * below it, prints the factual reason (interval + threshold) without a verdict
 * badge. The page must pass the real bar (0.524), never the coin-flip default.
 *
 * Server component — pure read of lib/tracker/inconclusive.ts.
 */

import { readRate } from "@/lib/tracker/inconclusive";

export function VerdictLine({
  wins,
  losses,
  minSample,
  threshold = 0.5,
}: {
  wins: number;
  losses: number;
  /** The page's own settled floor — passed in so the two never disagree. */
  minSample: number;
  threshold?: number;
}) {
  const n = wins + losses;
  const read = readRate(wins, n, { threshold, minSample });
  // D22: a verdict word only when the LOWER bound clears the threshold.
  const clearsBreakEven = read.rate !== null && read.low > threshold;

  return (
    <p
      data-testid="verdict-line"
      data-verdict={read.confidence}
      data-threshold={threshold}
      className="mt-1 text-xs text-ion-2"
    >
      {read.rate === null ? (
        <>
          <span className="font-mono uppercase tracking-wider text-ion-3">
            No verdict
          </span>{" "}
          — {read.reason}
        </>
      ) : clearsBreakEven ? (
        <>
          <span className="font-mono uppercase tracking-wider text-verify">
            Conclusive
          </span>{" "}
          — {read.reason}
        </>
      ) : (
        read.reason
      )}
    </p>
  );
}

export default VerdictLine;