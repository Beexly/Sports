/**
 * DECISION FACTORY — Intelligence Ledger (the organism-level Conscience).
 *
 * The card factory measures a card; the Conscience measures the ORGANISM over time. Seven ledgers —
 * Detection, Refusal, Scar, Source Rent, Compression, Product Clarity, Theory Health.
 *
 * Statistical discipline (hardened): a Conscience must not overclaim. It does NOT label fixture or
 * thin-sample trends "genuinely improving". A ledger only reaches VALIDATED_IMPROVING on LIVE data with
 * ≥ `minPeriods` independent periods, a positive trend that (a) survives Benjamini-Hochberg FDR, (b)
 * clears an effect-size floor, and (c) is directionally consistent across a discovery AND a confirmation
 * window. Variance is estimated with a lag-1 Newey-West (HAC) correction for serial dependence; ZERO
 * observed variance is treated as undefined (no fabricated significance — the old t=50 is gone). Repeated
 * looks spend alpha (`priorLooks` tightens q). On fixtures, the report is explicitly FIXTURE_TREND /
 * UNVALIDATED. Pure + deterministic.
 */

import { benjaminiHochberg, studentTTwoSidedP, type PValueEntry } from "@sports/prediction-engine";
import { ecologyCensus, type TheoryOrganism } from "@sports/engine";

export interface LedgerSample {
  readonly cycleId: string;
  readonly detectionValue: number;
  readonly trapAvoidanceValue: number;
  readonly falseSuppressionCost: number;
  readonly trueTrapSuppressions: number;
  readonly falseBlocks: number;
  readonly ghostSuppressions: number;
  readonly decisionLeverageCreated: number;
  readonly falseConfidenceCost: number;
  readonly sourceCost: number;
  readonly cardDecisionLeverage: number;
  readonly factVolumeCostNoise: number;
  readonly decisionLeverageDisplayed: number;
  readonly cognitiveLoad: number;
  readonly theories: readonly TheoryOrganism[];
}

export type LedgerName =
  | "detection" | "refusal" | "scar" | "sourceRent" | "compression" | "productClarity" | "theoryHealth";

export type TrendDirection = "UP" | "FLAT" | "DOWN";

export type LedgerStatus =
  | "INSUFFICIENT_SAMPLE" // too few periods, or zero/undefined variance — can't say anything
  | "FIXTURE_TREND" // computed on fixture data — illustrative only, never a validated claim
  | "FLAT_OR_REGRESSING"
  | "UPWARD_UNVALIDATED" // up, but fails FDR / effect floor / confirmation
  | "VALIDATED_IMPROVING"; // the only status that licenses "improving"

export interface LedgerResult {
  readonly ledger: LedgerName;
  readonly latest: number;
  readonly meanDelta: number;
  readonly effectSize: number; // standardized per-step effect (meanDelta / HAC sd)
  readonly ci95Lower: number;
  readonly ci95Upper: number;
  readonly pValue: number;
  readonly qValue: number;
  readonly n: number; // number of periods (deltas)
  readonly trendDirection: TrendDirection;
  readonly status: LedgerStatus;
  /** True ONLY when status === VALIDATED_IMPROVING. False on all fixture/thin-sample data. */
  readonly improving: boolean;
  readonly note: string;
}

export interface IntelligenceLedgerReport {
  readonly ledgers: Readonly<Record<LedgerName, LedgerResult>>;
  readonly dataMode: "FIXTURE" | "LIVE";
  /** Ledgers that reached VALIDATED_IMPROVING (0 on fixtures). */
  readonly validatedImprovingCount: number;
  /** Ledgers merely trending up (not validated) — the honest fixture signal. */
  readonly upwardTrendCount: number;
  /** Back-compat alias of validatedImprovingCount. */
  readonly improvingCount: number;
  /** Normalized aggregate of VALIDATED ledgers' standardized effects (unit-consistent, bounded). 0 if none. */
  readonly intelligenceDelta: number;
  readonly fdrQ: number;
  readonly effectiveQ: number;
  readonly validated: boolean;
  readonly note: string;
}

export interface LedgerOptions {
  readonly q?: number;
  readonly dataMode?: "FIXTURE" | "LIVE";
  readonly minPeriods?: number;
  readonly effectFloor?: number;
  readonly priorLooks?: number;
}

const EPS = 1e-9;

/** Per-ledger scalar metric for one cycle. Scar penalizes falseBlocks (precision-aware, not just hit count). */
function metricSeries(samples: readonly LedgerSample[]): Record<LedgerName, number[]> {
  const series: Record<LedgerName, number[]> = {
    detection: [], refusal: [], scar: [], sourceRent: [], compression: [], productClarity: [], theoryHealth: [],
  };
  for (const s of samples) {
    series.detection.push(s.detectionValue);
    series.refusal.push(s.trapAvoidanceValue - s.falseSuppressionCost);
    // Scar NET utility: real trap suppressions, PENALIZED by false blocks, per ghost suppression.
    series.scar.push((s.trueTrapSuppressions - s.falseBlocks) / Math.max(1, s.ghostSuppressions));
    series.sourceRent.push(s.decisionLeverageCreated - s.falseConfidenceCost - s.sourceCost);
    series.compression.push(s.cardDecisionLeverage / Math.max(EPS, s.factVolumeCostNoise));
    series.productClarity.push(s.decisionLeverageDisplayed / Math.max(EPS, s.cognitiveLoad));
    const c = ecologyCensus(s.theories);
    const total = Math.max(1, s.theories.length);
    series.theoryHealth.push((c.LAW + 0.5 * c.HYPOTHESIS - c.QUARANTINED - c.RETIRED) / total);
  }
  return series;
}

function firstDiffs(metric: readonly number[]): number[] {
  const d: number[] = [];
  for (let i = 1; i < metric.length; i++) d.push(metric[i]! - metric[i - 1]!);
  return d;
}

function mean(xs: readonly number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

interface TrendStats {
  readonly meanDelta: number;
  readonly hacSd: number; // Newey-West (lag-1) standard deviation of the deltas
  readonly effectSize: number;
  readonly se: number;
  readonly t: number;
  readonly df: number;
  readonly p: number;
  readonly degenerate: boolean; // < 2 periods or zero/undefined variance
  readonly m: number;
}

/**
 * One-sample trend test on the first-differences with a lag-1 Newey-West (HAC) variance to account for
 * serial dependence. Zero observed variance → degenerate (NO fabricated t-statistic).
 */
function trendTest(deltas: readonly number[]): TrendStats {
  const m = deltas.length;
  if (m < 2) return { meanDelta: 0, hacSd: 0, effectSize: 0, se: 0, t: 0, df: 0, p: 1, degenerate: true, m };
  const mu = mean(deltas);
  const gamma0 = deltas.reduce((a, b) => a + (b - mu) ** 2, 0) / (m - 1);
  let gamma1 = 0;
  for (let i = 1; i < m; i++) gamma1 += (deltas[i]! - mu) * (deltas[i - 1]! - mu);
  gamma1 /= m - 1;
  // Newey-West with bandwidth L=1: σ² = γ0 + 2(1 - 1/2)γ1 = γ0 + γ1; guard a negative estimate.
  let nwVar = gamma0 + gamma1;
  if (!(nwVar > 0)) nwVar = gamma0;
  const hacSd = Math.sqrt(Math.max(0, nwVar));
  if (hacSd < EPS) {
    // Zero/undefined variability — cannot establish significance. (Was: t = ±50. Removed.)
    return { meanDelta: Number(mu.toFixed(6)), hacSd: 0, effectSize: 0, se: 0, t: 0, df: m - 1, p: 1, degenerate: true, m };
  }
  const se = hacSd / Math.sqrt(m);
  const t = mu / se;
  return {
    meanDelta: Number(mu.toFixed(6)),
    hacSd,
    effectSize: Number((mu / hacSd).toFixed(4)),
    se,
    t,
    df: m - 1,
    p: studentTTwoSidedP(t, m - 1),
    degenerate: false,
    m,
  };
}

/** Directionally consistent across a discovery window AND a held-out confirmation window. */
function confirmationConsistent(deltas: readonly number[]): boolean {
  const m = deltas.length;
  if (m < 4) return false;
  const half = Math.floor(m / 2);
  return mean(deltas.slice(0, half)) > 0 && mean(deltas.slice(half)) > 0;
}

export function buildIntelligenceLedger(samples: readonly LedgerSample[], opts: LedgerOptions = {}): IntelligenceLedgerReport {
  const q = opts.q ?? 0.1;
  const dataMode = opts.dataMode ?? "FIXTURE"; // fail-closed: unproven data is a fixture trend
  const minPeriods = opts.minPeriods ?? 8;
  const effectFloor = opts.effectFloor ?? 0.2;
  const priorLooks = Math.max(0, opts.priorLooks ?? 0);
  // Sequential-monitoring discipline: each prior look spends alpha (Bonferroni across looks).
  const effectiveQ = q / (priorLooks + 1);

  const series = metricSeries(samples);
  const names = Object.keys(series) as LedgerName[];
  const computed = names.map((name) => {
    const metric = series[name];
    const deltas = firstDiffs(metric);
    return { name, metric, deltas, stats: trendTest(deltas) };
  });

  const entries: PValueEntry[] = computed.map((x) => ({ key: x.name, pValue: x.stats.p }));
  const bh = benjaminiHochberg(entries, effectiveQ);
  const bhByKey = new Map(bh.results.map((r) => [r.key, r]));

  const ledgers = {} as Record<LedgerName, LedgerResult>;
  let validatedImprovingCount = 0;
  let upwardTrendCount = 0;
  let normalizedAgg = 0;

  for (const x of computed) {
    const bhr = bhByKey.get(x.name)!;
    const s = x.stats;
    const trendDirection: TrendDirection = s.meanDelta > EPS ? "UP" : s.meanDelta < -EPS ? "DOWN" : "FLAT";
    if (trendDirection === "UP") upwardTrendCount += 1;

    let status: LedgerStatus;
    if (dataMode !== "LIVE") {
      status = trendDirection === "UP" ? "FIXTURE_TREND" : "FLAT_OR_REGRESSING";
    } else if (s.degenerate || s.m < minPeriods) {
      status = "INSUFFICIENT_SAMPLE";
    } else if (trendDirection !== "UP") {
      status = "FLAT_OR_REGRESSING";
    } else {
      const passes = bhr.discovery && Math.abs(s.effectSize) >= effectFloor && confirmationConsistent(x.deltas);
      status = passes ? "VALIDATED_IMPROVING" : "UPWARD_UNVALIDATED";
    }

    const improving = status === "VALIDATED_IMPROVING";
    if (improving) {
      validatedImprovingCount += 1;
      normalizedAgg += Math.tanh(s.effectSize); // unit-consistent, bounded
    }

    const ci95Lower = Number((s.meanDelta - 1.96 * s.se).toFixed(4));
    const ci95Upper = Number((s.meanDelta + 1.96 * s.se).toFixed(4));

    ledgers[x.name] = {
      ledger: x.name,
      latest: Number((x.metric[x.metric.length - 1] ?? 0).toFixed(4)),
      meanDelta: s.meanDelta,
      effectSize: s.effectSize,
      ci95Lower,
      ci95Upper,
      pValue: Number(s.p.toFixed(4)),
      qValue: Number(bhr.qValue.toFixed(4)),
      n: s.m,
      trendDirection,
      status,
      improving,
      note: statusNote(status, s, dataMode),
    };
  }

  const intelligenceDelta = Number((validatedImprovingCount > 0 ? normalizedAgg / names.length : 0).toFixed(4));
  const validated = validatedImprovingCount > 0;
  const note =
    dataMode !== "LIVE"
      ? `FIXTURE TREND — ${upwardTrendCount}/7 ledgers trending up; 0 validated. UNVALIDATED until a LIVE sample of ≥${minPeriods} periods.`
      : `${validatedImprovingCount}/7 ledgers VALIDATED improving (BH-FDR effective q=${effectiveQ.toFixed(3)}, ≥${minPeriods} periods, effect ≥ ${effectFloor}, confirmation window).`;

  return {
    ledgers,
    dataMode,
    validatedImprovingCount,
    upwardTrendCount,
    improvingCount: validatedImprovingCount,
    intelligenceDelta,
    fdrQ: q,
    effectiveQ: Number(effectiveQ.toFixed(4)),
    validated,
    note,
  };
}

function statusNote(status: LedgerStatus, s: TrendStats, dataMode: "FIXTURE" | "LIVE"): string {
  switch (status) {
    case "VALIDATED_IMPROVING":
      return `Validated improving — +${s.meanDelta}/period (effect ${s.effectSize}), survives FDR + confirmation.`;
    case "UPWARD_UNVALIDATED":
      return `Up (+${s.meanDelta}/period) but does NOT clear FDR / effect floor / confirmation — not a validated claim.`;
    case "FIXTURE_TREND":
      return `Upward fixture trend (+${s.meanDelta}/period) — illustrative only, not validated (${dataMode} data).`;
    case "INSUFFICIENT_SAMPLE":
      return s.degenerate ? "Insufficient/zero-variance sample — undefined." : `Insufficient sample (${s.m} periods).`;
    case "FLAT_OR_REGRESSING":
      return "Flat or regressing.";
  }
}
