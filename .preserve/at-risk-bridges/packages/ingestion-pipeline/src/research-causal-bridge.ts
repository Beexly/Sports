/**
 * Research bridge — wires the causal / simulation research surface into the
 * live pipeline: capital growth under a Kelly stake, the double-machine-learn
 * (QB-out ATT) estimator with its placebo and sensitivity diagnostics, the
 * negative-binomial RBPF filter, and opponent-adjusted EPA netting.
 *
 * This is the "prove the engine is better than noise, and net the schedule"
 * layer. A stake that only works on planted edge is a bug, not an edge, so the
 * null suite and the planted comparison are first-class evals rather than
 * research-only scripts.
 *
 * Fail-closed on missing inputs. Nothing is imputed. A thin sample is a
 * refusal, never a neutral zero.
 */

import {
  // capital
  stepCapital,
  runCapital,
  runNullSuite,
  runPlantedComparison,
  type CapitalPath,
  type RunOptions,
  type NullReport,
  type PlantedReport,
  // dml panel
  timeIndex,
  generateDmlPanel,
  DEFAULT_PANEL,
  type DmlGameRow,
  type PanelDesign,
  // dml estimate
  TRIM_LOW,
  TRIM_HIGH,
  N_FOLDS,
  FILTER_INTERVENTION_GAIN,
  estimateQbOutAtt,
  placeboAtt,
  sensitivityInterval,
  diagnoseQbOut,
  type DmlEstimate,
  type DmlDiagnostics,
  // nb-rbpf
  R9_SNAPSHOT_VERSION,
  FIXED_LAMBDA,
  MAX_PARTICLES,
  MAX_UNITS,
  logNbPmf,
  NbRbpf,
  type NbRbpfOptions,
  type NbRbpfDiagnostics,
  // synthetic nb
  DEFAULT_DESIGN,
  drawNb,
  generateSyntheticGames,
  type SyntheticGame,
  type SyntheticDesign,
  // opponent adjusted epa
  computeOpponentAdjustedEpa,
  type TeamGameEpaSplit,

  type OpponentAdjustedEpaOptions,
  type OpponentAdjustedEpaSolve,
  // calibration action policy
  calibrationActionCap,
  calibrationRequiresHardPass,
  calibrationRiskSeverity,
} from "@sports/prediction-engine";

export type ResearchEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): ResearchEval<never> {
  return { ok: false, reason };
}

function finite(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n);
}

// ── Capital growth under a Kelly stake ───────────────────────────────────────

export type StepCapitalEval = ResearchEval<number>;

/**
 * One capital step: C_{t+1} = C_t * (1 - lambda + lambda*e). e is the
 * realized edge in [0,1]; lambda is the fraction staked. The engine refuses
 * to step into a non-positive or non-finite bankroll and returns the prior
 * capital — this bridge surfaces that refusal as a non-positive result.
 */
export function evalStepCapital(input: {
  readonly capital: number;
  readonly edge: number;
  readonly lambda: number;
}): StepCapitalEval {
  const { capital, edge, lambda } = input;
  if (!finite(capital) || capital <= 0) {
    return fail(`capital must be finite > 0 — not imputed`);
  }
  if (!finite(edge)) return fail(`edge must be finite — not imputed`);
  if (!finite(lambda) || lambda < 0 || lambda > 1) {
    return fail(`lambda must be finite in [0,1] — not imputed`);
  }
  try {
    const next = stepCapital(capital, edge, lambda);
    if (!finite(next) || next <= 0) {
      return fail("capital step left a non-positive bankroll — refusing");
    }
    return { ok: true, data: Number(next.toFixed(6)) };
  } catch (e) {
    return fail(`threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export type RunCapitalEval = ResearchEval<CapitalPath>;

/**
 * Run one seeded synthetic season through the RBPF + Kelly stack. Returns
 * the terminal/max capital path. Deterministic in the seed.
 */
export function evalRunCapital(options: RunOptions): RunCapitalEval {
  if (options == null) return fail("run options missing — not imputed");
  if (!finite(options.seed) || !Number.isInteger(options.seed)) {
    return fail(`seed must be a finite integer — not imputed`);
  }
  if (typeof options.planted !== "boolean") {
    return fail(`planted must be an explicit boolean — not imputed`);
  }
  try {
    const path = runCapital(options);
    if (!finite(path.terminal) || !finite(path.maxCapital) || !Number.isInteger(path.n)) {
      return fail("capital path returned a non-finite or malformed shape — refusing");
    }
    if (path.terminal <= 0) return fail("terminal capital is non-positive — refusing");
    return { ok: true, data: path };
  } catch (e) {
    return fail(`threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export type NullSuiteEval = ResearchEval<NullReport>;

/**
 * The null test: over `seeds` pure-noise seasons, how often does the engine
 * exceed 20x capital? pass is the honest verdict — it is allowed to be false.
 * Fail-closed on a non-positive seed count (a zero-seed suite proves nothing).
 */
export function evalNullSuite(
  seeds: number,
  startSeed = 1,
): NullSuiteEval {
  if (!finite(seeds) || !Number.isInteger(seeds) || seeds <= 0) {
    return fail(`seeds must be a positive integer — not imputed`);
  }
  if (!finite(startSeed)) return fail(`startSeed must be finite — not imputed`);
  try {
    const r = runNullSuite(seeds, startSeed);
    if (!finite(r.rate) || r.rate < 0 || r.rate > 1) {
      return fail("null rate outside [0,1] — refusing");
    }
    return { ok: true, data: r };
  } catch (e) {
    return fail(`threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export type PlantedComparisonEval = ResearchEval<PlantedReport>;

/**
 * The planted test: on a planted edge, does the closed-loop engine beat the
 * open-loop baseline on median max capital? beatsOpenLoop is the verdict and
 * is allowed to be false.
 */
export function evalPlantedComparison(
  seeds: number,
  startSeed = 10_000,
): PlantedComparisonEval {
  if (!finite(seeds) || !Number.isInteger(seeds) || seeds <= 0) {
    return fail(`seeds must be a positive integer — not imputed`);
  }
  if (!finite(startSeed)) return fail(`startSeed must be finite — not imputed`);
  try {
    const r = runPlantedComparison(seeds, startSeed);
    if (!finite(r.engineMedianMax) || !finite(r.openLoopMedianMax)) {
      return fail("planted medians non-finite — refusing");
    }
    return { ok: true, data: r };
  } catch (e) {
    return fail(`threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ── DML panel + QB-out ATT estimator ─────────────────────────────────────────

export type TimeIndexEval = ResearchEval<number>;

/** Panel time key (season*100 + week) used to order every cross-fit split. */
export function evalTimeIndex(row: DmlGameRow | null | undefined): TimeIndexEval {
  if (row == null) return fail("panel row missing — not imputed");
  if (!finite(row.season) || !finite(row.week)) {
    return fail(`season and week required — not imputed`);
  }
  try {
    return { ok: true, data: timeIndex(row) };
  } catch (e) {
    return fail(`threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export type DmlPanelEval = ResearchEval<readonly DmlGameRow[]>;

/** Generate a balanced synthetic DML panel. Deterministic in the seed. */
export function evalGenerateDmlPanel(
  seed: number,
  design: PanelDesign = DEFAULT_PANEL,
): DmlPanelEval {
  if (!finite(seed) || !Number.isInteger(seed)) {
    return fail(`seed must be a finite integer — not imputed`);
  }
  if (
    design == null ||
    !finite(design.nTeams) ||
    !finite(design.nWeeks) ||
    !finite(design.nSeasons) ||
    design.nTeams < 2 ||
    design.nWeeks < 1 ||
    design.nSeasons < 1
  ) {
    return fail(`panel design must have >=2 teams and >=1 week/season — not imputed`);
  }
  try {
    const rows = generateDmlPanel(seed, design);
    if (!Array.isArray(rows) || rows.length === 0) {
      return fail("panel generation produced no rows — refusing");
    }
    return { ok: true, data: rows };
  } catch (e) {
    return fail(`threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export type QbOutAttEval = ResearchEval<DmlEstimate>;

/**
 * Double-machine-learn ATT on QB-out rows: cross-fitted propensity and
 * outcome models with trimming. n below the fold count is a refusal — an ATT
 * estimated on no overlap is not a number, it is a guess.
 */
export function evalQbOutAtt(
  rows: readonly DmlGameRow[] | null | undefined,
): QbOutAttEval {
  if (!Array.isArray(rows) || rows.length === 0) {
    return fail("DML rows empty — not imputed");
  }
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r == null || (r.treatment !== 0 && r.treatment !== 1)) {
      return fail(`row ${i}: treatment must be 0|1 — not imputed`);
    }
  }
  try {
    const est = estimateQbOutAtt(rows);
    if (!finite(est.att) || !finite(est.se)) {
      return fail("ATT estimate non-finite — refusing");
    }
    return { ok: true, data: est };
  } catch (e) {
    return fail(`threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export type PlaceboAttEval = ResearchEval<DmlEstimate>;

/**
 * The placebo arm: shuffle treatment within week and re-estimate. A real ATT
 * should NOT be reproducible from a placebo; this is how that gets checked.
 */
export function evalPlaceboAtt(
  rows: readonly DmlGameRow[] | null | undefined,
  seed: number,
): PlaceboAttEval {
  if (!Array.isArray(rows) || rows.length === 0) {
    return fail("DML rows empty — not imputed");
  }
  if (!finite(seed) || !Number.isInteger(seed)) {
    return fail(`seed must be a finite integer — not imputed`);
  }
  try {
    const est = placeboAtt(rows, seed);
    if (!finite(est.att) || !finite(est.se)) {
      return fail("placebo ATT non-finite — refusing");
    }
    return { ok: true, data: est };
  } catch (e) {
    return fail(`threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export type SensitivityIntervalEval = ResearchEval<readonly [number, number]>;

/** Rosenbaum-style sensitivity interval: widen the CI by gamma >= 1. */
export function evalSensitivityInterval(
  est: DmlEstimate | null | undefined,
  gamma: number,
): SensitivityIntervalEval {
  if (est == null) return fail("estimate missing — not imputed");
  if (!finite(est.att) || !finite(est.se)) {
    return fail("estimate att/se must be finite — not imputed");
  }
  if (!finite(gamma) || gamma < 1) {
    return fail(`gamma must be finite >= 1 — not imputed`);
  }
  try {
    const [lo, hi] = sensitivityInterval(est, gamma);
    if (!finite(lo) || !finite(hi)) return fail("sensitivity interval non-finite — refusing");
    if (lo > hi) return fail("sensitivity interval is inverted — refusing");
    return { ok: true, data: [lo, hi] };
  } catch (e) {
    return fail(`threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export type DiagnoseQbOutEval = ResearchEval<DmlDiagnostics>;

/** The full diagnostic: estimate + placebo arm + sensitivity interval. */
export function evalDiagnoseQbOut(
  rows: readonly DmlGameRow[] | null | undefined,
  placeboSeed = 7,
): DiagnoseQbOutEval {
  if (!Array.isArray(rows) || rows.length === 0) {
    return fail("DML rows empty — not imputed");
  }
  if (!finite(placeboSeed) || !Number.isInteger(placeboSeed)) {
    return fail(`placeboSeed must be a finite integer — not imputed`);
  }
  try {
    const d = diagnoseQbOut(rows, placeboSeed);
    if (!finite(d.estimate?.att) || !finite(d.placeboAtt)) {
      return fail("diagnostics non-finite — refusing");
    }
    return { ok: true, data: d };
  } catch (e) {
    return fail(`threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ── Negative-binomial RBPF ──────────────────────────────────────────────────

export type LogNbPmfEval = ResearchEval<number>;

/**
 * log NB pmf. The engine returns a -1e12 sentinel for invalid input rather
 * than NaN; this bridge refuses instead of passing a sentinel through as if
 * it were a density.
 */
export function evalLogNbPmf(
  y: number,
  mu: number,
  phi: number,
): LogNbPmfEval {
  if (!finite(y) || y < 0) return fail(`y must be finite >= 0 — not imputed`);
  if (!finite(mu) || mu <= 0) return fail(`mu must be finite > 0 — not imputed`);
  if (!finite(phi) || phi <= 0) return fail(`phi must be finite > 0 — not imputed`);
  try {
    const v = logNbPmf(y, mu, phi);
    // The engine's invalid-input sentinel is exactly -1e12.
    if (!finite(v) || v <= -1e12) {
      return fail("log NB pmf returned the engine's invalid sentinel — refusing");
    }
    return { ok: true, data: Number(v.toFixed(6)) };
  } catch (e) {
    return fail(`threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export type RbpfSnapshotEval =
  | {
      readonly ok: true;
      readonly snapshot: ReturnType<NbRbpf["snapshot"]>;
      readonly diagnostics: NbRbpfDiagnostics;
    }
  | { readonly ok: false; readonly reason: string };

function failRbpf(reason: string): RbpfSnapshotEval {
  return { ok: false, reason };
}

/**
 * Construct an RBPF filter, run the given observations, and return the
 * versioned snapshot plus ESS diagnostics. An ESS below a sane fraction is
 * reported honestly rather than hidden.
 */
export function evalRbpfRun(input: {
  readonly options: NbRbpfOptions;
  readonly games: readonly SyntheticGame[];
}): RbpfSnapshotEval {
  const { options, games } = input;
  if (options == null) return failRbpf("RBPF options missing — not imputed");
  if (!finite(options.seed) || !Number.isInteger(options.seed)) {
    return failRbpf(`seed must be a finite integer — not imputed`);
  }
  for (const k of ["nTeams", "nPitchers", "nParks", "nUmpires"] as const) {
    const v = options[k];
    if (!finite(v) || v < 1) {
      return failRbpf(`${k} must be finite >= 1 — not imputed`);
    }
  }
  if (options.nTeams > MAX_UNITS || options.nPitchers > MAX_UNITS) {
    return failRbpf(`RBPF unit counts exceed MAX_UNITS=${MAX_UNITS} — refusing`);
  }
  if (!Array.isArray(games) || games.length === 0) {
    return failRbpf("games empty — not imputed");
  }
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (g == null || !Number.isInteger(g.y) || (g.y as number) < 0) {
      return failRbpf(`row ${i}: y must be a non-negative integer — not imputed`);
    }
  }
  try {
    const filter = new NbRbpf(options);
    for (const g of games) {
      filter.update(g);
    }
    const snapshot = filter.snapshot();
    const diagnostics = filter.diagnostics();
    if (!finite(diagnostics.ess) || diagnostics.ess < 0) {
      return failRbpf("RBPF diagnostics report a non-finite ESS — refusing");
    }
    return { ok: true, snapshot, diagnostics };
  } catch (e) {
    return failRbpf(`threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ── Synthetic negative-binomial generator ───────────────────────────────────

export type DrawNbEval = ResearchEval<number>;

/**
 * Draw one NB count. The engine mutates the caller-owned rng state object,
 * so this bridge takes a seed and owns the state rather than leaking it.
 */
export function evalDrawNb(
  seed: number,
  mu: number,
  phi: number,
): DrawNbEval {
  if (!finite(seed) || !Number.isInteger(seed)) {
    return fail(`seed must be a finite integer — not imputed`);
  }
  if (!finite(mu) || mu <= 0) return fail(`mu must be finite > 0 — not imputed`);
  if (!finite(phi) || phi <= 0) return fail(`phi must be finite > 0 — not imputed`);
  try {
    const v = drawNb({ state: seed >>> 0 }, mu, phi);
    if (!finite(v) || v < 0) return fail("NB draw produced a negative or non-finite count — refusing");
    return { ok: true, data: v };
  } catch (e) {
    return fail(`threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export type SyntheticGamesEval = ResearchEval<readonly SyntheticGame[]>;

/** Generate a synthetic baseball schedule. Deterministic in the seed. */
export function evalGenerateSyntheticGames(
  seed: number,
  design: SyntheticDesign = DEFAULT_DESIGN,
): SyntheticGamesEval {
  if (!finite(seed) || !Number.isInteger(seed)) {
    return fail(`seed must be a finite integer — not imputed`);
  }
  if (design == null || !finite(design.nGames) || design.nGames < 1) {
    return fail(`design.nGames must be finite >= 1 — not imputed`);
  }
  try {
    const games = generateSyntheticGames(seed, design);
    if (!Array.isArray(games) || games.length === 0) {
      return fail("generator produced no games — refusing");
    }
    return { ok: true, data: games };
  } catch (e) {
    return fail(`threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ── Opponent-adjusted EPA (the big one: nets the schedule) ──────────────────

export type OpponentAdjustedEpaEval = ResearchEval<OpponentAdjustedEpaSolve>;

/**
 * Opponent-adjusted EPA by iterative netting: each team's raw EPA/play is
 * re-expressed net of the average quality of the opponents it actually faced.
 * This is the single biggest structural upgrade over an Elo-only model, so it
 * is wired as a first-class live eval rather than a research script.
 *
 * Fails closed on an empty game set, and reports a non-converged solve as
 * data (with `converged: false`) rather than pretending it converged.
 */
export function evalOpponentAdjustedEpa(
  games: readonly TeamGameEpaSplit[] | null | undefined,
  options?: OpponentAdjustedEpaOptions,
): OpponentAdjustedEpaEval {
  if (!Array.isArray(games) || games.length === 0) {
    return fail("EPA game rows empty — not imputed");
  }
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (
      g == null ||
      typeof g.team !== "string" ||
      g.team.length === 0 ||
      typeof g.opponent !== "string" ||
      g.opponent.length === 0
    ) {
      return fail(`row ${i}: team and opponent names required — not imputed`);
    }
    if (!finite(g.offDropbackPlays) || g.offDropbackPlays < 0) {
      return fail(`row ${i}: offDropbackPlays must be finite >= 0 — not imputed`);
    }
    if (!finite(g.offRushPlays) || g.offRushPlays < 0) {
      return fail(`row ${i}: offRushPlays must be finite >= 0 — not imputed`);
    }
  }
  try {
    const solve = computeOpponentAdjustedEpa(games, options ?? {});
    if (!Array.isArray(solve.results) || solve.results.length === 0) {
      return fail("EPA solve produced no team results — refusing");
    }
    if (!Number.isInteger(solve.iterations) || solve.iterations < 0) {
      return fail("EPA solve iteration count is malformed — refusing");
    }
    return { ok: true, data: solve };
  } catch (e) {
    return fail(`threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ── Calibration action policy ────────────────────────────────────────────────

export type CalibrationStatus =
  | "VALIDATED"
  | "WATCH"
  | "INSUFFICIENT_SAMPLE"
  | "DRIFTING"
  | "BLOCKED";

const CALIBRATION_STATUSES: readonly CalibrationStatus[] = [
  "VALIDATED",
  "WATCH",
  "INSUFFICIENT_SAMPLE",
  "DRIFTING",
  "BLOCKED",
];

export type CalibrationPolicyEval =
  | {
      readonly ok: true;
      readonly data: {
        readonly cap: number;
        readonly requiresHardPass: boolean;
        readonly severity: number;
      };
    }
  | { readonly ok: false; readonly reason: string };

/**
 * The publish policy derived from a calibration contract status: how high
 * confidence may go, whether a hard pass is required, and how severe the
 * risk is. An unknown status is a refusal — we do not guess a cap.
 */
export function evalCalibrationPolicy(
  status: string | null | undefined,
): CalibrationPolicyEval {
  if (typeof status !== "string") {
    return fail(`calibration status missing — not imputed`);
  }
  if (!CALIBRATION_STATUSES.includes(status as CalibrationStatus)) {
    return fail(`unknown calibration status "${status}" — not imputed`);
  }
  try {
    const s = status as CalibrationStatus;
    const cap = calibrationActionCap(s as never);
    const requiresHardPass = calibrationRequiresHardPass(s as never);
    const severity = calibrationRiskSeverity(s as never);
    if (!finite(cap) || cap < 0 || cap > 100) {
      return fail("calibration cap outside [0,100] — refusing");
    }
    if (!finite(severity) || severity < 0 || severity > 1) {
      return fail("calibration severity outside [0,1] — refusing");
    }
    return { ok: true, data: { cap, requiresHardPass, severity } };
  } catch (e) {
    return fail(`threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export {
  TRIM_LOW,
  TRIM_HIGH,
  N_FOLDS,
  FILTER_INTERVENTION_GAIN,
  R9_SNAPSHOT_VERSION,
  FIXED_LAMBDA,
  MAX_PARTICLES,
  MAX_UNITS,
  DEFAULT_PANEL,
  DEFAULT_DESIGN,
  type CapitalPath,
  type RunOptions,
  type NullReport,
  type PlantedReport,
  type DmlGameRow,
  type PanelDesign,
  type DmlEstimate,
  type DmlDiagnostics,
  type NbRbpfOptions,
  type NbRbpfDiagnostics,
  type SyntheticGame,
  type SyntheticDesign,
  type TeamGameEpaSplit,
  type OpponentAdjustedEpaOptions,
  type OpponentAdjustedEpaSolve,
};
