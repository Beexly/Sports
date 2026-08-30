/**
 * Glass Ledger — presentation-only formatting for substantiated metrics.
 *
 * Pure functions, no I/O, no gating logic. Every `SubstantiatedMetric` passed
 * in here has ALREADY cleared `renderableMetricOrNull` (`./display-guard`) —
 * these functions never decide WHETHER a number may render, only HOW. Do not
 * add fallback/placeholder branches here that invent a value; an unguarded
 * metric must be caught upstream by the guard, not papered over with a "—"
 * inside a formatter.
 */

import type { SubstantiatedMetric } from "./display-guard";

/** How a metric's headline `value` is denominated, per the guard's own contract. */
export type MetricUnit = "percent" | "bps" | "score";

/** Headline value, formatted per its unit: a ratio, a bps delta, or a 3-decimal score. */
export function formatMetricValue(metric: SubstantiatedMetric, unit: MetricUnit): string {
  switch (unit) {
    case "percent":
      return `${(metric.value * 100).toFixed(1)}%`;
    case "bps":
      return `${metric.value > 0 ? "+" : ""}${metric.value.toFixed(1)} bps`;
    case "score":
      return metric.value.toFixed(3);
  }
}

/** The Wilson/Clopper-Pearson lower bound, as a percentage. */
export function formatLowerBoundPct(metric: SubstantiatedMetric): string {
  return `${(metric.lowerBound.value * 100).toFixed(1)}%`;
}

/** Short label for which lower-bound method backs the number. */
export function lowerBoundMethodLabel(metric: SubstantiatedMetric): string {
  return metric.lowerBound.method === "wilson" ? "Wilson" : "Clopper-Pearson";
}

/** Coverage as "fired/eligible", grouped for readability. */
export function formatCoverage(metric: SubstantiatedMetric): string {
  const grouped = (n: number): string => n.toLocaleString("en-US");
  return `${grouped(metric.coverage.fired)}/${grouped(metric.coverage.eligible)}`;
}

/** CLV backing (the mean realized closing-line value behind this number), in bps. */
export function formatClvBacking(metric: SubstantiatedMetric): string {
  const v = metric.clv.meanBps;
  return `${v > 0 ? "+" : ""}${v.toFixed(1)} bps (n=${metric.clv.settledCount.toLocaleString("en-US")})`;
}

/** Short, footnote-safe form of a 64-hex stamp hash: `a1b2c3d4e5…`. */
export function shortHash(hash: string, length = 10): string {
  return `${hash.slice(0, length)}…`;
}

/** One-line footnote summarizing the walk-forward lineage leg. */
export function formatLineageFootnote(metric: SubstantiatedMetric): string {
  const when = new Date(metric.provenance.generatedAt).toUTCString();
  return `${metric.provenance.modelVersion} · ${shortHash(metric.provenance.stampHash)} · generated ${when}`;
}
