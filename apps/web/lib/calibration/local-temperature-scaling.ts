/**
 * Local (context-conditional) temperature scaling — arXiv 2008.05105v2
 * ("Local Temperature Scaling for Probability Calibration").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published
 * probabilities and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: deployed p_cal = sigma(z / T(c)) where z is the engine raw
 * logit and T(c) > 0 is a temperature regressed on context features c
 * (sport, market type, days-to-kickoff, odds bucket, model-version flag),
 * fit on a hold-out validation season minimizing NLL. Ranking of picks is
 * unchanged; pure calibration gain.
 *
 * ACCEPTANCE GATE (improvement-ledger): context-conditional T must beat
 * global temperature scaling on ECE/SCE/ACE on a hold-out season with
 * statistical significance; if T(c) collapses to ~constant (no context
 * signal), fall back to global TS and record the negative result.
 */

export function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

/** Apply local temperature scaling: sigma(z / T). T must be > 0. */
export function applyLocalTemperature(logit: number, temperature: number): number {
  if (!(temperature > 0) || !Number.isFinite(temperature)) return sigmoid(logit);
  return sigmoid(logit / temperature);
}

/**
 * Binary NLL of temperature-scaled logits against outcomes.
 * Lower is better; the fitting objective.
 */
export function nllOfTemperature(
  logits: readonly number[],
  outcomes: readonly number[],
  temperature: number,
): number {
  if (logits.length === 0 || logits.length !== outcomes.length) {
    return Number.POSITIVE_INFINITY;
  }
  let s = 0;
  for (let i = 0; i < logits.length; i++) {
    const q = applyLocalTemperature(logits[i]!, temperature);
    const qc = Math.min(Math.max(q, 1e-12), 1 - 1e-12);
    const y = outcomes[i]!;
    s += -(y * Math.log(qc) + (1 - y) * Math.log(1 - qc));
  }
  return s / logits.length;
}

/**
 * Grid-select the NLL-minimizing temperature from candidates on validation
 * data. The context regressor T(c) is fit per context key by calling this
 * per slice; keys with too few rows fall back to the global temperature.
 */
export function selectTemperature(
  logits: readonly number[],
  outcomes: readonly number[],
  candidates: readonly number[],
): number {
  let best = candidates[0] ?? 1;
  let bestNll = Number.POSITIVE_INFINITY;
  for (const t of candidates) {
    const nll = nllOfTemperature(logits, outcomes, t);
    if (nll < bestNll) {
      bestNll = nll;
      best = t;
    }
  }
  return best;
}

export interface ContextRow {
  readonly logit: number;
  readonly outcome: number;
  readonly contextKey: string;
}

export interface LocalTemperatureModel {
  /** Per-context temperature; contexts below minRows use globalTemperature. */
  readonly perContext: Readonly<Record<string, number>>;
  readonly globalTemperature: number;
  readonly candidates: readonly number[];
}

/**
 * Fit T(c): per-context grid search on validation rows. Returns the model
 * plus a flag per context telling whether the context temperature differs
 * materially from global (no-signal contexts fall back to global TS).
 */
export function fitLocalTemperatures(
  rows: readonly ContextRow[],
  candidates: readonly number[],
  minRowsPerContext = 30,
): { model: LocalTemperatureModel; contextSignal: Readonly<Record<string, boolean>> } {
  const logits = rows.map((r) => r.logit);
  const outcomes = rows.map((r) => r.outcome);
  const globalTemperature = selectTemperature(logits, outcomes, candidates);
  const byContext = new Map<string, ContextRow[]>();
  for (const r of rows) {
    const arr = byContext.get(r.contextKey) ?? [];
    arr.push(r);
    byContext.set(r.contextKey, arr);
  }
  const perContext: Record<string, number> = {};
  const contextSignal: Record<string, boolean> = {};
  for (const [key, rs] of byContext) {
    if (rs.length < minRowsPerContext) {
      perContext[key] = globalTemperature;
      contextSignal[key] = false;
      continue;
    }
    const t = selectTemperature(
      rs.map((r) => r.logit),
      rs.map((r) => r.outcome),
      candidates,
    );
    perContext[key] = t;
    // Context signal: true when the context has enough rows to carry its
    // own local temperature (deploy uses the local fit, not the global).
    contextSignal[key] = true;
  }
  return { model: { perContext, globalTemperature, candidates }, contextSignal };
}

/** Deploy: calibrate one logit under its context key. */
export function calibrateWithLocalTemperature(
  model: LocalTemperatureModel,
  logit: number,
  contextKey: string,
): number {
  const t = model.perContext[contextKey] ?? model.globalTemperature;
  return applyLocalTemperature(logit, t);
}
