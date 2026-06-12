import type { PickPremortemSnapshotInput } from "./build";

/**
 * Fragility Score — the premortem's structural risk, made a number.
 *
 * Counts what the pick LEANED ON and how thin that basis was, from the
 * signal snapshot captured at scoring time. 0 = structurally sturdy,
 * 100 = everything load-bearing is thin or volatile.
 *
 * STRUCTURAL ONLY — its known weakness is stated in the output: it does
 * not model variance, opponent quality, or outcome probability, and it
 * never touches fair-prob/EV (gated on pick surfaces). Components are
 * published with their weights so the number is checkable by hand.
 */

export interface FragilityComponent {
  readonly name: string;
  readonly points: number;
  readonly max: number;
  readonly why: string;
}

export type FragilityBand = "low" | "moderate" | "high" | "severe";

export interface FragilityScore {
  /** 0–100, sum of the published components. */
  readonly score: number;
  readonly band: FragilityBand;
  readonly components: readonly FragilityComponent[];
  /** The stated limitation — rendered wherever the score is. */
  readonly weakness: string;
}

const WEAKNESS =
  "Structural only: counts how thin the pick's basis was at scoring — " +
  "not variance, opponent quality, or outcome probability.";

const ATS_SAMPLE_FLOOR = 10;
const H2H_SAMPLE_FLOOR = 5;

export function computeFragilityScore(
  snapshot: PickPremortemSnapshotInput | null,
): FragilityScore | null {
  if (!snapshot) return null;

  const components: FragilityComponent[] = [];

  // Book depth (0–25): a thin market basis is the loudest structural risk.
  const books = Math.max(0, snapshot.bookmakerCount);
  const bookPoints = round1(25 * clamp01((8 - books) / 6)); // 8+ books → 0, ≤2 → 25
  components.push({
    name: "Book depth",
    points: bookPoints,
    max: 25,
    why: `${books} books in the snapshot (8+ reads as full depth)`,
  });

  // Evidence health (0–25): inverse of the recorded data-quality score.
  const dq = clamp(snapshot.dataQualityScore, 0, 100);
  const dqPoints = round1(25 * ((100 - dq) / 100));
  components.push({
    name: "Evidence health",
    points: dqPoints,
    max: 25,
    why: `data quality ${Math.round(dq)}/100 at scoring`,
  });

  // Sample thinness (0–25): only samples the model actually leaned on count.
  const sampleShortfalls: number[] = [];
  if (snapshot.hadAtsFormSignal && snapshot.atsFormSampleSize !== null) {
    sampleShortfalls.push(
      clamp01((ATS_SAMPLE_FLOOR - snapshot.atsFormSampleSize) / ATS_SAMPLE_FLOOR),
    );
  }
  if (snapshot.hadH2HSignal && snapshot.h2hSampleSize !== null) {
    sampleShortfalls.push(
      clamp01((H2H_SAMPLE_FLOOR - snapshot.h2hSampleSize) / H2H_SAMPLE_FLOOR),
    );
  }
  const samplePoints =
    sampleShortfalls.length === 0
      ? 0
      : round1(
          (25 * sampleShortfalls.reduce((a, b) => a + b, 0)) /
            sampleShortfalls.length,
        );
  components.push({
    name: "Sample thinness",
    points: samplePoints,
    max: 25,
    why:
      sampleShortfalls.length === 0
        ? "no sample-based signal was leaned on"
        : `form/h2h samples vs floors of ${ATS_SAMPLE_FLOOR}/${H2H_SAMPLE_FLOOR} games`,
  });

  // Context volatility (0–25): each leaned-on context that can move after
  // the snapshot (availability, weather, venue translation) adds risk.
  const volatile = [
    snapshot.hadInjurySignal,
    snapshot.hadWeatherSignal,
    snapshot.hadVenueSignal,
  ].filter(Boolean).length;
  const volatilePoints = round1(Math.min(25, volatile * (25 / 3)));
  components.push({
    name: "Context volatility",
    points: volatilePoints,
    max: 25,
    why: `${volatile} post-snapshot-movable context signal${volatile === 1 ? "" : "s"} leaned on`,
  });

  const score = round1(
    components.reduce((sum, c) => sum + c.points, 0),
  );

  return { score, band: band(score), components, weakness: WEAKNESS };
}

function band(score: number): FragilityBand {
  if (score <= 25) return "low";
  if (score <= 50) return "moderate";
  if (score <= 75) return "high";
  return "severe";
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function clamp01(x: number): number {
  return clamp(x, 0, 1);
}

function round1(x: number): number {
  return Number(x.toFixed(1));
}
