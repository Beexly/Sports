/**
 * ENS-10: A Dataset For Post-Processing Ensemble Weather Forecasts
 *
 * arXiv:2206.14786 · lane:weather · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adopt the EECRPS-style metric: score all GSE weather-edge models with extreme-weighted CRPS on
 * the NFL stadium dataset (high-wind, heavy-precip, cold games) — extreme games are where weather
 * edges pay; train the baseline ladder (MLP -> LeNet -> per-pixel transformer) on GEFS/HRRR
 * ensemble reforecasts over 30 stadium neighborhoods as the cheap warm-start before the flow
 * model; don't download 3TB — implement on GEFS reforecast for stadium neighborhoods only — then
 * train the baselines with an EECRPS-weighted loss and test whether extreme-optimized models beat
 * CRPS-optimized ones on heavy-precip/high-wind kickoff games without losing average CRPS.
 *
 * ACCEPTANCE GATE: ADOPT iff any NN baseline cuts CRPS >= 10% vs raw on wind speed AND the EECRPS ranking matches
 * the CRPS ranking (extreme skill not traded away); REJECT if Gaussian-CRPS post-processing can't
 * beat raw on wind speed — then go straight to the flow/LGBM recipes and this paper stays a metric
 * citation.
 *
 * Ingest role: schemas (ENS-10 ensemble post-processing dataset adapter: member schema + EMOS-lite).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2206.14786" as const;
export const LANE = "weather" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT iff any NN baseline cuts CRPS >= 10% vs raw on wind speed AND the EECRPS ranking matches
 * the CRPS ranking (extreme skill not traded away); REJECT if Gaussian-CRPS post-processing can't
 * beat raw on wind speed — then go straight to the flow/LGBM recipes and this paper stays a metric
 * citation.`;

export const CONFIG = {
  enabled: false,
  dataset: "ENS-10",
  members: 10,
  variables: ["t2m", "tcc"],
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface EnsMember {
  readonly gridpoint: string;
  readonly validAt: string;
  readonly member: number;
  readonly t2m: number;
  readonly tcc: number;
}

export function isEnsMember(x: unknown): x is EnsMember {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["gridpoint"] === "string" &&
    typeof o["validAt"] === "string" && Number.isFinite(Date.parse(o["validAt"] as string)) &&
    Number.isInteger(o["member"]) && (o["member"] as number) >= 0 && (o["member"] as number) < 10 &&
    isFiniteNumber(o["t2m"]) &&
    isFiniteNumber(o["tcc"]) && (o["tcc"] as number) >= 0 && (o["tcc"] as number) <= 1
  );
}

/** Group members by gridpoint+validAt. */
export function groupEnsemble(rows: readonly unknown[]): Map<string, EnsMember[]> {
  const groups = new Map<string, EnsMember[]>();
  for (const r of rows) {
    if (!isEnsMember(r)) continue;
    const key = `${r.gridpoint}|${r.validAt}`;
    const g = groups.get(key) ?? [];
    g.push(r);
    groups.set(key, g);
  }
  return groups;
}

/** EMOS-lite: Gaussian predictive from ensemble mean/spread (affine recalibration). */
export function emosLite(
  members: readonly EnsMember[],
  a = 0,
  b = 1,
  c = 0,
  d = 1,
): { mean: number; sd: number } | null {
  if (members.length === 0 || ![a, b, c, d].every(isFiniteNumber) || d <= 0) return null;
  const vals = members.map((m) => m.t2m);
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) * (v - mean), 0) / vals.length);
  return { mean: a + b * mean, sd: Math.sqrt(Math.max(1e-9, c + d * sd * sd)) };
}

/** CRPS for a Gaussian forecast (closed form). */
export function crpsGaussian(mean: number, sd: number, obs: number): number | null {
  if (![mean, sd, obs].every(isFiniteNumber) || sd <= 0) return null;
  const z = (obs - mean) / sd;
  const phi = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
  const Phi = 0.5 * (1 + erf(z / Math.SQRT2));
  return sd * (z * (2 * Phi - 1) + 2 * phi - 1 / Math.sqrt(Math.PI));
}

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
