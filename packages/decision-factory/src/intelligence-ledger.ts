/**
 * DECISION FACTORY — Intelligence Ledger (the organism-level Conscience).
 *
 * The card factory measures a card; the Conscience measures the ORGANISM: is it becoming better at
 * turning reality into deserved decisions over time? Seven ledgers — Detection, Refusal, Scar, Source
 * Rent, Compression, Product Clarity, Theory Health — each a trend over cycles.
 *
 * The frontier discipline: a Conscience must not p-hack its own "we improved" claims. Every ledger's
 * improvement is a one-sample t-test on its per-cycle deltas (reusing the engine's `studentTTwoSidedP`),
 * and the seven p-values are corrected together with Benjamini-Hochberg FDR (`benjaminiHochberg`). A
 * ledger only reads as "improving" if its trend is positive AND it survives FDR — so a lucky last-cycle
 * uptick on a noisy metric is NOT declared a discovery. Pure + deterministic.
 */

import { benjaminiHochberg, studentTTwoSidedP, type PValueEntry } from "@sports/prediction-engine";
import { ecologyCensus, type TheoryOrganism } from "@sports/engine";

export interface LedgerSample {
  readonly cycleId: string;
  // Detection
  readonly detectionValue: number; // meaningful_change × time_advantage × decision_relevance
  // Refusal
  readonly trapAvoidanceValue: number;
  readonly falseSuppressionCost: number;
  // Scar
  readonly trueTrapSuppressions: number;
  readonly falseBlocks: number;
  readonly ghostSuppressions: number;
  // Source Rent
  readonly decisionLeverageCreated: number;
  readonly falseConfidenceCost: number;
  readonly sourceCost: number;
  // Compression
  readonly cardDecisionLeverage: number;
  readonly factVolumeCostNoise: number;
  // Product Clarity
  readonly decisionLeverageDisplayed: number;
  readonly cognitiveLoad: number;
  // Theory ecology census input
  readonly theories: readonly TheoryOrganism[];
}

export type LedgerName =
  | "detection"
  | "refusal"
  | "scar"
  | "sourceRent"
  | "compression"
  | "productClarity"
  | "theoryHealth";

export interface LedgerResult {
  readonly ledger: LedgerName;
  readonly latest: number;
  readonly meanDelta: number;
  readonly pValue: number;
  readonly qValue: number;
  readonly n: number;
  /** True only if the trend is positive AND it survives FDR correction. */
  readonly improving: boolean;
  readonly note: string;
}

export interface IntelligenceLedgerReport {
  readonly ledgers: Readonly<Record<LedgerName, LedgerResult>>;
  /** Sum of improvements that survived FDR minus those that regressed — the honest delta. */
  readonly intelligenceDelta: number;
  readonly improvingCount: number;
  readonly fdrQ: number;
  readonly note: string;
}

const EPS = 1e-9;

/** Per-ledger scalar metric for one cycle. */
function metricSeries(samples: readonly LedgerSample[]): Record<LedgerName, number[]> {
  const series: Record<LedgerName, number[]> = {
    detection: [], refusal: [], scar: [], sourceRent: [], compression: [], productClarity: [], theoryHealth: [],
  };
  for (const s of samples) {
    series.detection.push(s.detectionValue);
    series.refusal.push(s.trapAvoidanceValue - s.falseSuppressionCost); // RefusalAlpha
    series.scar.push(s.trueTrapSuppressions / Math.max(1, s.ghostSuppressions)); // ScarHitRate
    series.sourceRent.push(s.decisionLeverageCreated - s.falseConfidenceCost - s.sourceCost);
    series.compression.push(s.cardDecisionLeverage / Math.max(EPS, s.factVolumeCostNoise));
    series.productClarity.push(s.decisionLeverageDisplayed / Math.max(EPS, s.cognitiveLoad));
    const c = ecologyCensus(s.theories);
    const total = Math.max(1, s.theories.length);
    series.theoryHealth.push((c.LAW + 0.5 * c.HYPOTHESIS - c.QUARANTINED - c.RETIRED) / total);
  }
  return series;
}

/** One-sample t-test on the first-differences: is the metric trending up beyond noise? */
function trendTest(metric: readonly number[]): { meanDelta: number; t: number; df: number; p: number } {
  const deltas: number[] = [];
  for (let i = 1; i < metric.length; i++) deltas.push(metric[i]! - metric[i - 1]!);
  const m = deltas.length;
  if (m < 2) return { meanDelta: 0, t: 0, df: 0, p: 1 };
  const mean = deltas.reduce((a, b) => a + b, 0) / m;
  const variance = deltas.reduce((a, b) => a + (b - mean) ** 2, 0) / (m - 1);
  const sd = Math.sqrt(variance);
  const t = sd < EPS ? (Math.abs(mean) < EPS ? 0 : Math.sign(mean) * 50) : mean / (sd / Math.sqrt(m));
  const df = m - 1;
  return { meanDelta: Number(mean.toFixed(6)), t, df, p: studentTTwoSidedP(t, df) };
}

/**
 * Build the seven-ledger Conscience report from a time-ordered series of cycle samples, applying
 * Benjamini-Hochberg FDR across the seven improvement tests at level `q`.
 */
export function buildIntelligenceLedger(samples: readonly LedgerSample[], q = 0.1): IntelligenceLedgerReport {
  const series = metricSeries(samples);
  const names = Object.keys(series) as LedgerName[];

  const tests = names.map((name) => {
    const metric = series[name];
    const tt = trendTest(metric);
    return { name, metric, ...tt };
  });

  // FDR-correct the seven improvement p-values together.
  const entries: PValueEntry[] = tests.map((x) => ({ key: x.name, pValue: x.p }));
  const bh = benjaminiHochberg(entries, q);
  const bhByKey = new Map(bh.results.map((r) => [r.key, r]));

  const ledgers = {} as Record<LedgerName, LedgerResult>;
  let intelligenceDelta = 0;
  let improvingCount = 0;
  for (const x of tests) {
    const bhr = bhByKey.get(x.name)!;
    // Improving only if the trend is UP and the discovery survives FDR (can't p-hack a noisy uptick).
    const improving = x.meanDelta > 0 && bhr.discovery;
    if (improving) {
      improvingCount += 1;
      intelligenceDelta += x.meanDelta;
    } else if (x.meanDelta < 0 && bhr.discovery) {
      intelligenceDelta += x.meanDelta; // a real regression counts against us
    }
    ledgers[x.name] = {
      ledger: x.name,
      latest: Number((x.metric[x.metric.length - 1] ?? 0).toFixed(4)),
      meanDelta: x.meanDelta,
      pValue: Number(x.p.toFixed(4)),
      qValue: Number(bhr.qValue.toFixed(4)),
      n: x.metric.length,
      improving,
      note: improving
        ? `Improving — trend +${x.meanDelta}/cycle survives FDR (q=${bhr.qValue.toFixed(3)}).`
        : x.meanDelta > 0
          ? `Up last, but the trend does NOT survive FDR — not a real improvement (no p-hacking).`
          : "Flat or regressing.",
    };
  }

  return {
    ledgers,
    intelligenceDelta: Number(intelligenceDelta.toFixed(4)),
    improvingCount,
    fdrQ: q,
    note: `${improvingCount}/7 ledgers genuinely improving under BH-FDR (q=${q}); IntelligenceDelta ${intelligenceDelta.toFixed(3)}.`,
  };
}
