/**
 * Rushing-yards UNDER edge engine — the one validated market inefficiency, as a
 * pure, evidence-graded product primitive.
 *
 * Backed by RESEARCH_LOG_2026-06-25.md + PROP_FINDINGS.md: across three completed
 * prop-history seasons (2023, 2024, 2025; 2,061 settled lines) NFL rushing-yards
 * UNDER cashed 54.1% overall (p<0.001), concentrated on HIGH lines — the public
 * over-bets star RBs and books shade rush lines up. This module turns that finding
 * into a calibrated, honest assessment of a single line. It does NOT guarantee a
 * win; it reports the historical hit rate, its confidence interval, and a graded
 * recommendation that is conservative by construction.
 *
 * GRADING (vs the −110 vig break-even of 52.4%):
 *   STRONG_UNDER — bucket cleared FDR AND its 95% CI lower bound is ABOVE break-even.
 *   LEAN_UNDER   — bucket cleared FDR and point rate ≥ break-even, but the CI floor dips
 *                  below it (real but marginal; line-shop and size small).
 *   PASS         — efficient band or below break-even; no edge.
 *
 * Pure, deterministic, no I/O. The frozen bucket table is point-in-time evidence;
 * refreshing it as 2026+ settles is a deliberate, reviewed update (and the nightly
 * discovery loop would propose a DEMOTE if the edge decays).
 */

export type RushEdgeGrade = "STRONG_UNDER" | "LEAN_UNDER" | "PASS";

export interface RushEdgeBucket {
  /** Inclusive lower bound of the rushing-yards line. */
  readonly minLine: number;
  /** Exclusive upper bound (Infinity for the open-ended top bucket). */
  readonly maxLine: number;
  readonly label: string;
  /** Measured UNDER hit rate over the 3-season sample. */
  readonly underRate: number;
  readonly sampleSize: number;
  /** 95% Wilson interval on the under rate. */
  readonly ci95: readonly [number, number];
  /** Whether the bucket survived Benjamini-Hochberg FDR in the pooled study. */
  readonly fdrSignificant: boolean;
}

/** −110 break-even. Pass a higher value (e.g. 0.535 for −115) to be stricter on juice. */
export const VIG_BREAK_EVEN = 0.524;

/**
 * Frozen evidence from the pooled 2023–2025 deep dive (scripts/backtest/prop-rush-deepdive.ts).
 * Buckets are pre-registered; do not re-cut them to chase a number.
 */
export const RUSH_UNDER_BUCKETS_3SEASON: readonly RushEdgeBucket[] = [
  { minLine: 0, maxLine: 30, label: "line < 30", underRate: 0.530, sampleSize: 1056, ci95: [0.500, 0.560], fdrSignificant: true },
  { minLine: 30, maxLine: 50, label: "line 30–49.5", underRate: 0.566, sampleSize: 426, ci95: [0.518, 0.612], fdrSignificant: true },
  { minLine: 50, maxLine: 70, label: "line 50–69.5", underRate: 0.520, sampleSize: 435, ci95: [0.473, 0.566], fdrSignificant: false },
  { minLine: 70, maxLine: Infinity, label: "line ≥ 70", underRate: 0.618, sampleSize: 144, ci95: [0.537, 0.693], fdrSignificant: true },
];

export interface RushEdgeAssessment {
  readonly line: number;
  readonly bucket: string;
  readonly grade: RushEdgeGrade;
  /** "UNDER" when the grade recommends a side, else null. */
  readonly side: "UNDER" | null;
  readonly historicalUnderRate: number;
  readonly ci95: readonly [number, number];
  readonly sampleSize: number;
  readonly breakEven: number;
  readonly rationale: string;
}

function bucketFor(line: number): RushEdgeBucket | null {
  return RUSH_UNDER_BUCKETS_3SEASON.find((b) => line >= b.minLine && line < b.maxLine) ?? null;
}

/**
 * Assess the rushing-yards UNDER edge for a single line. Conservative: recommends a side
 * only where the pooled 3-season evidence is FDR-significant and at/above the vig break-even,
 * and reserves STRONG for buckets whose CI floor is fully above break-even.
 */
export function assessRushUnderEdge(
  line: number,
  options: { breakEven?: number } = {},
): RushEdgeAssessment {
  if (!Number.isFinite(line) || line < 0) {
    throw new RangeError(`line must be a finite, non-negative number, got ${String(line)}`);
  }
  const breakEven = options.breakEven ?? VIG_BREAK_EVEN;
  const bucket = bucketFor(line);

  if (!bucket) {
    return {
      line, bucket: "unknown", grade: "PASS", side: null,
      historicalUnderRate: NaN, ci95: [NaN, NaN], sampleSize: 0, breakEven,
      rationale: "No evidence bucket covers this line.",
    };
  }

  const ciLow = bucket.ci95[0];
  let grade: RushEdgeGrade = "PASS";
  if (bucket.fdrSignificant && bucket.underRate >= breakEven) {
    grade = ciLow >= breakEven ? "STRONG_UNDER" : "LEAN_UNDER";
  }
  const side = grade === "PASS" ? null : "UNDER";

  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const rationale =
    grade === "STRONG_UNDER"
      ? `${bucket.label}: UNDER ${pct(bucket.underRate)} over ${bucket.sampleSize} lines (95% CI ${pct(ciLow)}–${pct(bucket.ci95[1])}), entirely above the ${pct(breakEven)} break-even. Public over-bias on big rush lines. Line-shop for −110+; size to bankroll.`
      : grade === "LEAN_UNDER"
        ? `${bucket.label}: UNDER ${pct(bucket.underRate)} over ${bucket.sampleSize} lines, FDR-significant and above ${pct(breakEven)} on the point estimate, but the CI floor (${pct(ciLow)}) dips below it. Real but marginal — only at −110 or better, small stakes.`
        : `${bucket.label}: UNDER ${pct(bucket.underRate)} over ${bucket.sampleSize} lines — not a confident edge (efficient band or below break-even). PASS.`;

  return {
    line, bucket: bucket.label, grade, side,
    historicalUnderRate: bucket.underRate, ci95: bucket.ci95, sampleSize: bucket.sampleSize, breakEven,
    rationale,
  };
}
