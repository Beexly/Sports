/**
 * VerdictLine — the interval gets a vote on the public calibration report.
 *
 * Closes wave 4 issue #806. The page already computes a Wilson band and withholds
 * the win rate below a sample floor; what it never did was *label* the result. A
 * rate whose 95% band still straddles the 50% line is now printed as
 * INCONCLUSIVE rather than presented with the same authority as a tight one.
 *
 * The competitor worth imitating (wbp318/cfb_2026) leads with an unproven result:
 * n=51, ROI −2.1%, CI [−40%, +41%], verdicts labeled inconclusive. One of 22
 * profiled repos does this; it is the one whose number could be trusted.
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
  const inconclusive = read.confidence === "inconclusive";

  return (
    <p
      data-testid="verdict-line"
      data-verdict={read.confidence}
      className="mt-1 text-xs text-ion-2"
    >
      {read.rate === null ? (
        <>
          <span className="font-mono uppercase tracking-wider text-ion-3">
            No verdict
          </span>{" "}
          — {read.reason}
        </>
      ) : (
        <>
          <span
            className={`font-mono uppercase tracking-wider ${
              inconclusive ? "text-caution" : "text-verify"
            }`}
          >
            {inconclusive ? "Inconclusive" : "Conclusive"}
          </span>{" "}
          — {read.reason}
        </>
      )}
    </p>
  );
}

export default VerdictLine;