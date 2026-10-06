/**
 * SDWPF: A Dataset for Spatial Dynamic Wind Power Forecasting
 *
 * arXiv:2208.04360v2 · lane:weather · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Use SDWPF as the benchmark substrate for GSE's wind-forecasting lane: reproduce the
 * Autoformer/Informer baselines on the public 48-hour task (RMSE ~= 47.1, MAE ~= 37.6
 * verification), verify a graph-wavenet variant beats the transformer baselines before committing
 * it to the stadium-wind network (turbines -> stadium locations, power -> wind speed/gusts,
 * retrained on public mesonet data); adopt the paper's data-caveat checklist (missing values,
 * status flags, abnormal readings) as the QA spec for any real wind-data pipeline — then shorten
 * the horizon to 6-24 hours (game-day relevant) and re-benchmark with turbine-to-turbine attention
 * learned from data vs fixed geographic adjacency.
 *
 * ACCEPTANCE GATE: ADAPT: the benchmark data and task definition are exactly what GSE needs to stand up a credible
 * wind-forecasting lane — value as substrate, not just method.
 *
 * Ingest role: schemas (SDWPF spatial-dynamic wind dataset adapter: turbine schema + ramp features).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2208.04360v2" as const;
export const LANE = "weather" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT: the benchmark data and task definition are exactly what GSE needs to stand up a credible
 * wind-forecasting lane — value as substrate, not just method.`;

export const CONFIG = {
  enabled: false,
  dataset: "SDWPF",
  horizon: "48h",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface TurbineReading {
  readonly turbineId: string;
  readonly recordedAt: string;
  readonly windSpeed: number;
  readonly windDir: number;
  readonly powerKw: number;
}

export function isTurbineReading(x: unknown): x is TurbineReading {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["turbineId"] === "string" &&
    typeof o["recordedAt"] === "string" && Number.isFinite(Date.parse(o["recordedAt"] as string)) &&
    isFiniteNumber(o["windSpeed"]) && (o["windSpeed"] as number) >= 0 &&
    isFiniteNumber(o["windDir"]) && (o["windDir"] as number) >= 0 && (o["windDir"] as number) < 360 &&
    isFiniteNumber(o["powerKw"]) && (o["powerKw"] as number) >= 0
  );
}

/** Power curve sanity: power non-decreasing in wind speed up to rated. */
export function powerCurveMonotone(readings: readonly unknown[], ratedKw: number): boolean | null {
  const v: TurbineReading[] = [];
  for (const r of readings) if (isTurbineReading(r)) v.push(r);
  if (v.length < 2 || !isFiniteNumber(ratedKw) || ratedKw <= 0) return null;
  const below = v.filter((r) => r.powerKw < ratedKw).sort((a, b) => a.windSpeed - b.windSpeed);
  for (let i = 1; i < below.length; i++) {
    if ((below[i]?.powerKw ?? 0) < (below[i - 1]?.powerKw ?? 0) - 1e-9) return false;
  }
  return true;
}

/** Ramp event: |power delta| over the window exceeds threshold. */
export function rampEvents(
  readings: readonly unknown[],
  windowMin = 60,
  threshKw = 500,
): Array<{ at: string; deltaKw: number }> {
  const v: TurbineReading[] = [];
  for (const r of readings) if (isTurbineReading(r)) v.push(r);
  v.sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  const out: Array<{ at: string; deltaKw: number }> = [];
  if (!isFiniteNumber(windowMin) || !isFiniteNumber(threshKw) || windowMin <= 0 || threshKw <= 0) return out;
  const winMs = windowMin * 60000;
  for (let i = 0; i < v.length; i++) {
    for (let j = i + 1; j < v.length; j++) {
      const dt = Date.parse(v[j]?.recordedAt ?? "") - Date.parse(v[i]?.recordedAt ?? "");
      if (dt > winMs) break;
      const d = (v[j]?.powerKw ?? 0) - (v[i]?.powerKw ?? 0);
      if (Math.abs(d) >= threshKw) {
        out.push({ at: v[j]?.recordedAt ?? "", deltaKw: d });
        break;
      }
    }
  }
  return out;
}

/** Capacity factor over the readings. */
export function capacityFactor(readings: readonly unknown[], ratedKw: number): number | null {
  const v: TurbineReading[] = [];
  for (const r of readings) if (isTurbineReading(r)) v.push(r);
  if (v.length === 0 || !isFiniteNumber(ratedKw) || ratedKw <= 0) return null;
  return v.reduce((s, r) => s + r.powerKw, 0) / (v.length * ratedKw);
}
