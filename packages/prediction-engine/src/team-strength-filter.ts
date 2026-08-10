/**
 * Sequential Monte Carlo latent team-strength filter (bootstrap particle filter) — shadow R&D.
 *
 * WHY THIS EXISTS (the gap it fills):
 *   Every other strength estimator in this package (elo-estimator, ml-estimator,
 *   opponent-adjusted) emits a POINT estimate. A point estimate cannot tell you
 *   how much it knows — a 3-game team and a 30-game team both hand back a number.
 *   That is exactly the information RES (Murphy resolution/discrimination) is
 *   made of: you can only sharpen a forecast away from the base rate to the
 *   extent the posterior genuinely supports it. A particle filter carries the
 *   whole posterior as a weighted cloud, so the win probability it emits is a
 *   MIXTURE over plausible worlds, not a plug-in. It also evolves in time, so a
 *   team that improved in November is not averaged against its September self.
 *
 * THE MODEL (research spec, verbatim in intent):
 *   state        s_t = a·s_{t-1} + B·u_t + eta,   eta ~ N(0, Q),  Q = processNoise²·I
 *   observation  y   = wᵀ(s_home − s_away) + homeAdvantage
 *   P(home win)  = sigmoid(y / sigma)
 *   `a` is the mean-reversion scalar (a<1 pulls strengths back toward the league
 *   mean, which is what regression to the mean actually looks like in state-space
 *   form). `u_t` is an optional per-team intervention (injury, rest days, travel)
 *   entering through the scalar gain B (`interventionGain`).
 *
 * IDENTIFIABILITY (stated honestly, because it constrains how you read output):
 *   Outcomes only ever observe the SCALAR projection wᵀs. With dim > 1 the
 *   individual latent coordinates are NOT identified by results — only their
 *   w-weighted sum is. The extra dimensions buy the filter a richer prior
 *   geometry (and a place to hang future observation channels: totals, spreads,
 *   pace), they do not buy per-dimension meaning. `posteriorFor()` therefore
 *   reports meanStrength (the identified projection) as the headline and
 *   meanByDim only as a diagnostic.
 *
 * WHY A CLASS, NOT AN IMMUTABLE STATE OBJECT (the header owes you this):
 *   The rest of this package prefers pure functions over frozen state records
 *   (see linear-thompson.ts). A particle filter is the case where that costs
 *   real money. Its state is nParticles × nTeams × dim doubles — at the defaults
 *   with a 30-team league that is 90,000 doubles, and a functional API would
 *   have to COPY all of it on every predict and every update, twice per game.
 *   Inside the serverless budget this module was sized for (hence nParticles
 *   1000, not 10000) that allocation churn is the dominant cost and would push
 *   a full-season replay into GC thrash. So: mutation is confined to Float64Array
 *   buffers owned by one instance, and the auditability guarantee is delivered
 *   the way this repo actually defines it — by an explicit required `seed`, so
 *   the same seed and the same call sequence reproduce the trajectory exactly.
 *   Every value handed OUT (`posterior`, `diagnostics`, `particleWeights`, the
 *   update report) is a fresh readonly snapshot; no caller can reach the buffers.
 *
 * WHY LOG-SPACE WEIGHTS (the correctness crux):
 *   The textbook update multiplies each particle weight by its likelihood. Every
 *   likelihood here is a probability ≤ 1, so after a few hundred observations the
 *   product underflows to exactly 0 for EVERY particle, and the normalisation
 *   0/0 hands back NaN — silently, and only on long sequences, which is the worst
 *   possible failure mode for a backtest. This filter therefore accumulates
 *   log-likelihoods and re-centres by subtracting the running maximum after every
 *   update, so the stored log weights always have max exactly 0 and exponentiate
 *   into [0, 1] with no underflow at all. log(1−sigmoid(x)) and log(sigmoid(x))
 *   are computed as −softplus(±x), never as log(1−p), so a 1.0-rounded p can
 *   never produce log(0) = −Infinity. An overflowed logit (±Infinity, reachable
 *   when sigma underflows toward 0) is NOT treated as unusable: sigmoid(±∞) = 1/0
 *   and −softplus(∓∞) = −0 are exact, so such a particle is simply a CERTAIN one
 *   and carries the most information in the cloud. Discarding it would bias the
 *   mixture toward 0.5 and make the forecast discontinuous in sigma. Only NaN is
 *   unusable. If the weights DO collapse anyway (a degenerate likelihood, e.g.
 *   an outcome that every single particle called impossible), the filter degrades
 *   honestly: it resets to uniform weights, increments `degenerateCount`, and
 *   keeps returning finite numbers. It never emits NaN.
 *
 * RESAMPLING: systematic by default (one uniform draw, N evenly-spaced strata —
 *   lower variance than multinomial and O(N)), multinomial available for
 *   comparison. Both are written against the two traps that make naive versions
 *   wrong: (1) the cumulative weight sum finishes a few ULPs BELOW 1.0, so the
 *   last stratum walks off the end of the array — the index is clamped at N−1
 *   instead; (2) the resampled cloud must be written to a separate buffer, since
 *   copying particle j from particle i in place corrupts particle i for a later
 *   j. Both schemes emit exactly N indices and reset weights to uniform.
 *
 * DETERMINISM: no Math.random, no Date.now. One seeded mulberry32 stream drives
 *   initialisation, the process noise and the resampling draws. `seed` is
 *   REQUIRED — there is no default, because an unseeded stochastic model output
 *   is not auditable and this repo's law is that every model output is versioned,
 *   reproducible and independently recomputable. The RNG is advanced identically
 *   regardless of `processNoise` (the draw happens even when it is scaled by 0),
 *   so two runs that differ only in noise level stay directly comparable.
 *
 * PURITY / POSTURE: shadow R&D. No database, no network, no environment reads,
 *   no feature-flag reads. This module does NOT read or flip CALIBRATION_ADJUSTMENTS,
 *   PERFORMANCE_STATS, RANKING_PAUSE_APPLY or AUTO_PUBLISH, and nothing it returns
 *   is priced or published. Structural misuse (bad dimensions, an out-of-range
 *   team index, home === away, a non-binary outcome) THROWS RangeError — those are
 *   programmer errors and must not be swallowed. Numerical degeneracy degrades
 *   gracefully and is reported in `diagnostics()`.
 */

/** Hard cap on the latent dimension (keeps the inner loops cache-friendly). */
export const MAX_STRENGTH_DIM = 16;
/** Hard cap on the team count. */
export const MAX_TEAMS = 4096;
/** Hard cap on the particle count. The DEFAULT (1000) is the serverless operating point. */
export const MAX_PARTICLES = 20_000;
/** Default particle count — deliberately 1000, not 10000: this must run in a serverless budget. */
export const DEFAULT_PARTICLES = 1000;
/**
 * Hard cap on nParticles × nTeams × dim — bounds worst-case memory. 4e6 doubles is
 * 32 MB per buffer, and the filter holds two (the cloud plus the resampling
 * scratch it swaps with), so this caps the particle state at ~64 MB.
 */
export const MAX_PARTICLE_CELLS = 4_000_000;

export type ResamplingScheme = "systematic" | "multinomial";

export type TeamStrengthFilterOptions = {
  /** Number of teams tracked. Integer in [2, MAX_TEAMS]. */
  readonly nTeams: number;
  /**
   * PRNG seed. REQUIRED — an unseeded stochastic model output is not auditable.
   * Any finite number; folded to uint32.
   */
  readonly seed: number;
  /** Latent strength dimension per team. Integer in [1, MAX_STRENGTH_DIM]. Default 3. */
  readonly dim?: number;
  /** Particle count. Integer in [1, MAX_PARTICLES]. Default DEFAULT_PARTICLES (1000). */
  readonly nParticles?: number;
  /** Mean-reversion scalar `a` in the dynamics. Finite, in [0, 1]. Default 0.98. */
  readonly a?: number;
  /** Per-dimension STANDARD DEVIATION of the process noise eta (Q = processNoise²·I). Default 0.02. */
  readonly processNoise?: number;
  /** Observation temperature: P = sigmoid(y / sigma). Finite, > 0. Default 1.0. */
  readonly sigma?: number;
  /** Additive home-field term on the logit scale (before the /sigma divide). Default 0.2. */
  readonly homeAdvantage?: number;
  /** Observation loading vector w (length `dim`, all finite). Default: all ones. */
  readonly w?: readonly number[];
  /** Scalar intervention gain B applied to every `predictStates` intervention. Default 1. */
  readonly interventionGain?: number;
  /**
   * Standard deviation of the initial particle cloud. Defaults to the stationary
   * sd of the AR(1) dynamics, processNoise / sqrt(1 − a²), which is the only
   * self-consistent prior; falls back to `processNoise` when a = 1 (pure random
   * walk, whose stationary variance is infinite).
   */
  readonly initialSd?: number;
  /** Resample when ESS < nParticles × essThreshold. In (0, 1]. Default 0.5. */
  readonly essThreshold?: number;
  /** Resampling scheme. Default "systematic". */
  readonly resampling?: ResamplingScheme;
};

/** An additive per-team intervention u_t (injury, rest days, travel). */
export type TeamIntervention = {
  /** Team index, integer in [0, nTeams). */
  readonly team: number;
  /** Additive drift. A scalar broadcasts to every latent dimension; a vector must have length `dim`. */
  readonly delta: number | readonly number[];
};

/** Per-team posterior summary (diagnostics surface). */
export type TeamPosterior = {
  readonly team: number;
  /** Weighted posterior mean of the identified projection wᵀs_team. */
  readonly meanStrength: number;
  /** Weighted posterior variance of wᵀs_team (particle-measure variance, ≥ 0). */
  readonly varianceStrength: number;
  /** Weighted posterior mean of each latent coordinate — diagnostic only (not identified). */
  readonly meanByDim: readonly number[];
};

/** Result of one Bayesian observation update. */
export type StrengthUpdateReport = {
  readonly homeIdx: number;
  readonly awayIdx: number;
  readonly outcome: number;
  /**
   * The PRE-update mixture forecast Σ_p w_p·sigmoid(y_p/sigma). This is the honest
   * out-of-sample prediction: it was formed before the outcome touched the weights,
   * so it is the number to feed a Brier/log-loss scorer.
   */
  readonly predictedHomeWinProb: number;
  /** −log p(observed outcome) under `predictedHomeWinProb` (clamped away from 0). */
  readonly logScore: number;
  /** (predictedHomeWinProb − outcome)² under the home-win convention. */
  readonly brier: number;
  /** ESS = 1/Σw² before the likelihood was applied. */
  readonly essBefore: number;
  /** ESS after the likelihood, before any resampling. */
  readonly essAfter: number;
  /** Whether this update triggered a resample. */
  readonly resampled: boolean;
  /** Whether the weights collapsed and were honestly reset to uniform. */
  readonly degenerate: boolean;
  readonly priced: false;
  readonly status: "shadow";
};

/** Bumped whenever the serialized layout changes; `restore` refuses anything else. */
export const FILTER_SNAPSHOT_VERSION = 1;

/**
 * Everything needed to resume a filter exactly. Plain JSON-safe arrays (not
 * typed arrays) so this survives a database round trip unchanged.
 */
export type FilterStateSnapshot = {
  readonly version: number;
  readonly nTeams: number;
  readonly dim: number;
  readonly nParticles: number;
  readonly a: number;
  readonly processNoise: number;
  readonly sigma: number;
  readonly homeAdvantage: number;
  readonly interventionGain: number;
  readonly initialSd: number;
  readonly essThreshold: number;
  readonly resampling: ResamplingScheme;
  readonly seed: number;
  readonly loading: readonly number[];
  readonly states: readonly number[];
  readonly logWeights: readonly number[];
  readonly rngState: number;
  readonly spareNormal: number | null;
  readonly step: number;
  readonly observations: number;
  readonly resampleCount: number;
  readonly degenerateCount: number;
};

/** Ops-facing filter health snapshot. */
export type FilterDiagnostics = {
  /** Number of `predictStates` calls (time steps evolved). */
  readonly step: number;
  /** Number of `update` calls (observations absorbed). */
  readonly observations: number;
  readonly nParticles: number;
  readonly nTeams: number;
  readonly dim: number;
  /** Current effective sample size, 1/Σw². */
  readonly ess: number;
  /** ess / nParticles, in (0, 1]. */
  readonly essFraction: number;
  readonly resampleCount: number;
  /** Times the weights collapsed and were reset to uniform. */
  readonly degenerateCount: number;
  /** Σw — must be ≈ 1; a sanity invariant, not a tuning knob. */
  readonly weightSum: number;
  /** Whether every weight is finite. */
  readonly weightsFinite: boolean;
  readonly priced: false;
  readonly status: "shadow";
};

/**
 * One mulberry32 step. Written as a pure (state) -> (state, value) function rather
 * than the usual closure so the generator's position in the stream is READABLE and
 * RESTORABLE — see `snapshot()`. A closure hides `a`, which would make a rehydrated
 * filter silently resume from a different point in the random stream and diverge
 * from the run it claims to continue.
 */
function mulberry32Step(state: number): { readonly state: number; readonly value: number } {
  let a = (state | 0) + 0x6d2b79f5;
  a |= 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { state: a, value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
}

/**
 * Overflow-free logistic. For x ≥ 0 uses 1/(1+e^-x) (the exponent is ≤ 0, so it
 * cannot overflow); for x < 0 uses e^x/(1+e^x) (same). ±Infinity map to 1/0
 * rather than NaN; NaN propagates as NaN and is filtered by the caller.
 */
export function stableSigmoid(x: number): number {
  if (Number.isNaN(x)) return Number.NaN;
  if (x >= 0) return 1 / (1 + Math.exp(-x));
  const e = Math.exp(x);
  return e / (1 + e);
}

/**
 * softplus(x) = log(1 + e^x), computed without overflow: for large positive x
 * the naive form overflows e^x, so we factor out x. Used only via ±: note
 * log sigmoid(x) = −softplus(−x) and log(1 − sigmoid(x)) = −softplus(x), which
 * is why this filter never evaluates log(1 − p) on a p that rounded to 1.
 */
export function softplus(x: number): number {
  if (Number.isNaN(x)) return Number.NaN;
  if (x > 0) return x + Math.log1p(Math.exp(-x));
  return Math.log1p(Math.exp(x));
}

function requireInteger(value: number, name: string, lo: number, hi: number): number {
  if (!Number.isInteger(value) || value < lo || value > hi) {
    throw new RangeError(
      `TeamStrengthFilter: ${name} must be an integer in [${lo}, ${hi}], received ${String(value)}`,
    );
  }
  return value;
}

function requireFinite(value: number, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RangeError(`TeamStrengthFilter: ${name} must be a finite number, received ${String(value)}`);
  }
  return value;
}

/**
 * Sequential Monte Carlo filter over latent team strengths.
 *
 * Intended call pattern, once per scheduled time step:
 *   filter.predictStates(interventions);           // prior / dynamics step
 *   const report = filter.update(home, away, y);   // Bayesian weight update
 *   // report.predictedHomeWinProb is out-of-sample — score it.
 */
export class TeamStrengthFilter {
  readonly nTeams: number;
  readonly dim: number;
  readonly nParticles: number;
  readonly a: number;
  readonly processNoise: number;
  readonly sigma: number;
  readonly homeAdvantage: number;
  readonly interventionGain: number;
  readonly initialSd: number;
  readonly essThreshold: number;
  readonly resampling: ResamplingScheme;
  readonly seed: number;

  /** Observation loading vector w (length dim). */
  private readonly loading: Float64Array;
  /** Particle states, row-major: index (p·nTeams + team)·dim + d. */
  private states: Float64Array;
  /** Write buffer for resampling (swapped with `states`, never aliased). */
  private scratch: Float64Array;
  /** Unnormalised log weights, re-centred to max 0 after every update. */
  private readonly logWeights: Float64Array;
  /** Scratch for normalised linear weights (rebuilt on demand, never handed out). */
  private readonly weightBuf: Float64Array;
  /** Scratch for per-particle logits during an update. */
  private readonly logitBuf: Float64Array;
  /** Scratch for the resampling cumulative sum. */
  private readonly cumBuf: Float64Array;
  /** Scratch for resampled parent indices. */
  private readonly indexBuf: Int32Array;

  /** mulberry32 position. Mutable and readable so `snapshot()` can capture it. */
  private rngState: number;
  /** Box–Muller spare; persists across calls (still fully deterministic). */
  private spareNormal: number | null = null;

  private stepCount = 0;
  private observationCount = 0;
  private resampleCountInternal = 0;
  private degenerateCountInternal = 0;

  /**
   * @throws RangeError on any structurally invalid option (this is programmer
   * error and must not be swallowed into a silent misconfiguration).
   */
  constructor(options: TeamStrengthFilterOptions) {
    if (options === null || typeof options !== "object") {
      throw new RangeError("TeamStrengthFilter: options object is required");
    }
    this.nTeams = requireInteger(options.nTeams, "nTeams", 2, MAX_TEAMS);
    this.dim = requireInteger(options.dim ?? 3, "dim", 1, MAX_STRENGTH_DIM);
    this.nParticles = requireInteger(
      options.nParticles ?? DEFAULT_PARTICLES,
      "nParticles",
      1,
      MAX_PARTICLES,
    );
    const cells = this.nParticles * this.nTeams * this.dim;
    if (cells > MAX_PARTICLE_CELLS) {
      throw new RangeError(
        `TeamStrengthFilter: nParticles×nTeams×dim = ${cells} exceeds MAX_PARTICLE_CELLS (${MAX_PARTICLE_CELLS})`,
      );
    }

    this.seed = requireFinite(options.seed, "seed") >>> 0;

    const a = requireFinite(options.a ?? 0.98, "a");
    if (a < 0 || a > 1) {
      throw new RangeError(`TeamStrengthFilter: a must lie in [0, 1] (non-explosive), received ${a}`);
    }
    this.a = a;

    const processNoise = requireFinite(options.processNoise ?? 0.02, "processNoise");
    if (processNoise < 0) {
      throw new RangeError(`TeamStrengthFilter: processNoise must be ≥ 0, received ${processNoise}`);
    }
    this.processNoise = processNoise;

    const sigma = requireFinite(options.sigma ?? 1.0, "sigma");
    if (!(sigma > 0)) {
      throw new RangeError(`TeamStrengthFilter: sigma must be > 0, received ${sigma}`);
    }
    this.sigma = sigma;

    this.homeAdvantage = requireFinite(options.homeAdvantage ?? 0.2, "homeAdvantage");
    this.interventionGain = requireFinite(options.interventionGain ?? 1, "interventionGain");

    const essThreshold = requireFinite(options.essThreshold ?? 0.5, "essThreshold");
    if (!(essThreshold > 0) || essThreshold > 1) {
      throw new RangeError(`TeamStrengthFilter: essThreshold must lie in (0, 1], received ${essThreshold}`);
    }
    this.essThreshold = essThreshold;

    const resampling = options.resampling ?? "systematic";
    if (resampling !== "systematic" && resampling !== "multinomial") {
      throw new RangeError(`TeamStrengthFilter: unknown resampling scheme "${String(resampling)}"`);
    }
    this.resampling = resampling;

    this.loading = new Float64Array(this.dim);
    const w = options.w;
    if (w === undefined) {
      this.loading.fill(1);
    } else {
      if (w.length !== this.dim) {
        throw new RangeError(`TeamStrengthFilter: w must have length dim (${this.dim}), received ${w.length}`);
      }
      for (let d = 0; d < this.dim; d++) {
        const v = w[d];
        if (v === undefined || !Number.isFinite(v)) {
          throw new RangeError(`TeamStrengthFilter: w[${d}] must be a finite number, received ${String(v)}`);
        }
        this.loading[d] = v;
      }
    }

    // Stationary sd of s_t = a·s_{t-1} + eta is processNoise/sqrt(1−a²); at a = 1
    // that is infinite (pure random walk), so fall back to one noise step.
    const stationarySd =
      a < 1 ? this.processNoise / Math.sqrt(1 - a * a) : this.processNoise;
    const initialSd = requireFinite(options.initialSd ?? stationarySd, "initialSd");
    if (initialSd < 0) {
      throw new RangeError(`TeamStrengthFilter: initialSd must be ≥ 0, received ${initialSd}`);
    }
    this.initialSd = initialSd;

    this.states = new Float64Array(cells);
    this.scratch = new Float64Array(cells);
    this.logWeights = new Float64Array(this.nParticles);
    this.weightBuf = new Float64Array(this.nParticles);
    this.logitBuf = new Float64Array(this.nParticles);
    this.cumBuf = new Float64Array(this.nParticles);
    this.indexBuf = new Int32Array(this.nParticles);

    this.rngState = this.seed >>> 0;

    // Draw the initial cloud from the (self-consistent) stationary prior N(0, initialSd²).
    for (let i = 0; i < cells; i++) {
      this.states[i] = this.initialSd * this.nextNormal();
    }
    this.setUniformWeights();
  }

  // ============================================================
  // Public API
  // ============================================================

  /**
   * Prior step: evolve every particle through s_t = a·s_{t-1} + B·u_t + eta.
   *
   * `interventions` is optional and sparse — pass only the teams that actually
   * carry a signal this step (an injury flag, a rest-days delta). Repeated
   * entries for the same team accumulate. Weights are untouched: propagating the
   * state does not change how plausible each particle is.
   *
   * @throws RangeError on an out-of-range team index, a non-finite delta, or a
   * vector delta whose length is not `dim`.
   */
  predictStates(interventions?: readonly TeamIntervention[]): void {
    const drift = this.buildDrift(interventions);
    const { nParticles, nTeams, dim, a, processNoise } = this;
    const s = this.states;
    for (let p = 0; p < nParticles; p++) {
      for (let t = 0; t < nTeams; t++) {
        const base = (p * nTeams + t) * dim;
        const dbase = t * dim;
        for (let d = 0; d < dim; d++) {
          // The normal is drawn unconditionally so the RNG stream is independent
          // of processNoise — runs that differ only in noise level stay comparable.
          const eta = this.nextNormal();
          const prev = s[base + d]!;
          const u = drift === null ? 0 : drift[dbase + d]!;
          s[base + d] = a * prev + u + processNoise * eta;
        }
      }
    }
    this.stepCount += 1;
  }

  /**
   * Bayesian weight update on one observed binary outcome.
   *
   * Returns the PRE-update mixture forecast alongside its scores and the ESS
   * either side of the update. Resamples afterwards if ESS fell below
   * nParticles × essThreshold.
   *
   * @param outcome 1 if the home team won, 0 if it did not.
   * @throws RangeError on an out-of-range index, homeIdx === awayIdx, or a
   * non-binary outcome.
   */
  update(homeIdx: number, awayIdx: number, outcome: number): StrengthUpdateReport {
    this.assertTeam(homeIdx, "homeIdx");
    this.assertTeam(awayIdx, "awayIdx");
    if (homeIdx === awayIdx) {
      throw new RangeError(
        `TeamStrengthFilter.update: homeIdx and awayIdx must differ (both ${homeIdx}) — a team cannot play itself`,
      );
    }
    if (outcome !== 0 && outcome !== 1) {
      throw new RangeError(`TeamStrengthFilter.update: outcome must be 0 or 1, received ${String(outcome)}`);
    }

    const n = this.nParticles;
    const degenerateBefore = this.degenerateCountInternal;

    this.syncWeights();
    const w = this.weightBuf;
    const essBefore = this.essOf(w);

    // Mixture forecast over the CURRENT (pre-update) posterior. Only NaN is
    // unusable. ±Infinity is NOT: sigmoid(±∞) = 1/0 exactly, so an overflowed
    // logit is a particle that is CERTAIN, and dropping it would bias the
    // mixture toward 0.5 by discarding precisely the most informative particles
    // (see the sigma-underflow continuity regression in the tests). NaN
    // particles are renormalised out rather than silently counted as 0.5.
    const logits = this.logitBuf;
    let acc = 0;
    let mass = 0;
    for (let p = 0; p < n; p++) {
      const y = (this.project(p, homeIdx) - this.project(p, awayIdx) + this.homeAdvantage) / this.sigma;
      logits[p] = y;
      if (!Number.isNaN(y)) {
        const wp = w[p]!;
        acc += wp * stableSigmoid(y);
        mass += wp;
      }
    }
    // No usable mass at all ⇒ the cloud carries no information. The honest
    // forecast is then the uninformative 0.5, not a number invented from NaN.
    const predictedHomeWinProb = mass > 0 ? Math.min(1, Math.max(0, acc / mass)) : 0.5;

    // Log-space likelihood: log sigmoid(y) = −softplus(−y), log(1−sigmoid(y)) = −softplus(y).
    // ±Infinity flows through correctly and must NOT be short-circuited: a particle
    // certain of the observed outcome scores −softplus(∓∞) = −0 (log-likelihood 0,
    // i.e. probability 1) and one certain of its opposite scores −∞ (it dies). That
    // is exactly the hard constraint the sigma → 0 limit imposes. Only NaN — a state
    // with no defined logit at all — is unusable, and it kills the particle.
    // Every term is ≤ 0, so this sum can never form (−∞) + (+∞) = NaN.
    const lw = this.logWeights;
    for (let p = 0; p < n; p++) {
      const y = logits[p]!;
      if (Number.isNaN(y)) {
        lw[p] = Number.NEGATIVE_INFINITY;
        continue;
      }
      lw[p] = lw[p]! + (outcome === 1 ? -softplus(-y) : -softplus(y));
    }
    this.recentreLogWeights();

    this.syncWeights();
    const essAfter = this.essOf(this.weightBuf);

    let resampled = false;
    if (essAfter < n * this.essThreshold) {
      this.resample();
      resampled = true;
    }

    this.observationCount += 1;

    const pObserved = outcome === 1 ? predictedHomeWinProb : 1 - predictedHomeWinProb;
    return {
      homeIdx,
      awayIdx,
      outcome,
      predictedHomeWinProb,
      logScore: -Math.log(Math.max(pObserved, Number.EPSILON)),
      brier: (predictedHomeWinProb - outcome) ** 2,
      essBefore,
      essAfter,
      resampled,
      degenerate: this.degenerateCountInternal > degenerateBefore,
      priced: false,
      status: "shadow",
    };
  }

  /**
   * Mixture forecast P(home win) at the current posterior, WITHOUT observing
   * anything. Pure: it neither mutates the cloud nor advances the RNG, so it is
   * safe to call for board display or for scoring a hypothetical matchup.
   *
   * @throws RangeError on an out-of-range index or homeIdx === awayIdx.
   */
  predictHomeWinProbability(homeIdx: number, awayIdx: number): number {
    this.assertTeam(homeIdx, "homeIdx");
    this.assertTeam(awayIdx, "awayIdx");
    if (homeIdx === awayIdx) {
      throw new RangeError(
        `TeamStrengthFilter.predictHomeWinProbability: homeIdx and awayIdx must differ (both ${homeIdx})`,
      );
    }
    this.syncWeights();
    const w = this.weightBuf;
    let acc = 0;
    let mass = 0;
    for (let p = 0; p < this.nParticles; p++) {
      const y = (this.project(p, homeIdx) - this.project(p, awayIdx) + this.homeAdvantage) / this.sigma;
      // Only NaN is unusable — see `update`. sigmoid(±∞) = 1/0 is exact and must count.
      if (Number.isNaN(y)) continue;
      const wp = w[p]!;
      acc += wp * stableSigmoid(y);
      mass += wp;
    }
    if (!(mass > 0)) return 0.5;
    return Math.min(1, Math.max(0, acc / mass));
  }

  /** Current effective sample size, ESS = 1/Σw². Ranges over (0, nParticles]. */
  effectiveSampleSize(): number {
    this.syncWeights();
    return this.essOf(this.weightBuf);
  }

  /** Fresh copy of the current normalised particle weights (sums to 1). */
  particleWeights(): readonly number[] {
    this.syncWeights();
    return Array.from(this.weightBuf);
  }

  /**
   * Posterior summary for one team.
   *
   * @throws RangeError on an out-of-range team index.
   */
  posteriorFor(team: number): TeamPosterior {
    this.assertTeam(team, "team");
    this.syncWeights();
    const w = this.weightBuf;
    const { nTeams, dim } = this;
    const s = this.states;
    const meanByDim = new Array<number>(dim).fill(0);
    let m1 = 0;
    let m2 = 0;
    for (let p = 0; p < this.nParticles; p++) {
      const wp = w[p]!;
      const base = (p * nTeams + team) * dim;
      let proj = 0;
      for (let d = 0; d < dim; d++) {
        const v = s[base + d]!;
        proj += this.loading[d]! * v;
        meanByDim[d] = meanByDim[d]! + wp * v;
      }
      m1 += wp * proj;
      m2 += wp * proj * proj;
    }
    // Weighted variance of a discrete measure with Σw = 1: E[x²] − E[x]².
    // Clamped at 0: catastrophic cancellation can push it a few ULPs negative.
    return {
      team,
      meanStrength: m1,
      varianceStrength: Math.max(0, m2 - m1 * m1),
      meanByDim,
    };
  }

  /** Posterior summary for every team, in team-index order. */
  posterior(): readonly TeamPosterior[] {
    const out: TeamPosterior[] = [];
    for (let t = 0; t < this.nTeams; t++) out.push(this.posteriorFor(t));
    return out;
  }

  /** Ops-facing health snapshot. Pure — does not advance the RNG. */
  /**
   * Full serializable state — everything needed to resume this filter EXACTLY.
   *
   * This exists because the intended host is serverless (Vercel), where every
   * invocation constructs a fresh instance. Without rehydration the filter is
   * permanently cold: it re-draws its prior cloud on each request, has zero
   * observations behind it, and reports ~0.5 forever. It cannot learn from
   * settled games no matter how many are fed to it. Persisting and restoring
   * this snapshot is what makes accumulated evidence real rather than notional.
   *
   * `rngState` is included deliberately. Restoring the particles but not the
   * generator's position would resume from a DIFFERENT point in the random
   * stream, so the continued run would silently diverge from the trajectory it
   * claims to continue — defeating the `seed`-based auditability this module's
   * header promises.
   *
   * Config is captured too so `restore` can REFUSE a snapshot whose geometry
   * does not match, rather than reinterpret the flat particle array under the
   * wrong shape and return plausible nonsense.
   */
  snapshot(): FilterStateSnapshot {
    return {
      version: FILTER_SNAPSHOT_VERSION,
      nTeams: this.nTeams,
      dim: this.dim,
      nParticles: this.nParticles,
      a: this.a,
      processNoise: this.processNoise,
      sigma: this.sigma,
      homeAdvantage: this.homeAdvantage,
      interventionGain: this.interventionGain,
      initialSd: this.initialSd,
      essThreshold: this.essThreshold,
      resampling: this.resampling,
      seed: this.seed,
      loading: Array.from(this.loading),
      states: Array.from(this.states),
      logWeights: Array.from(this.logWeights),
      rngState: this.rngState,
      spareNormal: this.spareNormal,
      step: this.stepCount,
      observations: this.observationCount,
      resampleCount: this.resampleCountInternal,
      degenerateCount: this.degenerateCountInternal,
    };
  }

  /**
   * Rebuild a filter from `snapshot()`. Throws RangeError on a version mismatch,
   * a geometry mismatch, or a wrong-length buffer — structural misuse, same
   * posture as the constructor. Silently accepting a mismatched snapshot would
   * reinterpret the particle cloud under the wrong shape and yield confident
   * nonsense, which is far worse than refusing.
   */
  static restore(snapshot: FilterStateSnapshot): TeamStrengthFilter {
    if (snapshot === null || typeof snapshot !== "object") {
      throw new RangeError("TeamStrengthFilter.restore: snapshot object is required");
    }
    if (snapshot.version !== FILTER_SNAPSHOT_VERSION) {
      throw new RangeError(
        `TeamStrengthFilter.restore: snapshot version ${String(snapshot.version)} is not ` +
          `${FILTER_SNAPSHOT_VERSION}; refusing to guess at the older layout`,
      );
    }
    const filter = new TeamStrengthFilter({
      nTeams: snapshot.nTeams,
      dim: snapshot.dim,
      nParticles: snapshot.nParticles,
      seed: snapshot.seed,
      a: snapshot.a,
      processNoise: snapshot.processNoise,
      sigma: snapshot.sigma,
      homeAdvantage: snapshot.homeAdvantage,
      interventionGain: snapshot.interventionGain,
      initialSd: snapshot.initialSd,
      essThreshold: snapshot.essThreshold,
      resampling: snapshot.resampling,
      w: snapshot.loading,
    });
    const cells = snapshot.nParticles * snapshot.nTeams * snapshot.dim;
    if (snapshot.states.length !== cells) {
      throw new RangeError(
        `TeamStrengthFilter.restore: states has ${snapshot.states.length} entries, expected ` +
          `${cells} for nParticles=${snapshot.nParticles} nTeams=${snapshot.nTeams} dim=${snapshot.dim}`,
      );
    }
    if (snapshot.logWeights.length !== snapshot.nParticles) {
      throw new RangeError(
        `TeamStrengthFilter.restore: logWeights has ${snapshot.logWeights.length} entries, ` +
          `expected nParticles=${snapshot.nParticles}`,
      );
    }
    filter.states.set(snapshot.states);
    filter.logWeights.set(snapshot.logWeights);
    filter.rngState = snapshot.rngState >>> 0;
    filter.spareNormal = snapshot.spareNormal;
    filter.stepCount = snapshot.step;
    filter.observationCount = snapshot.observations;
    filter.resampleCountInternal = snapshot.resampleCount;
    filter.degenerateCountInternal = snapshot.degenerateCount;
    return filter;
  }

  diagnostics(): FilterDiagnostics {
    this.syncWeights();
    const w = this.weightBuf;
    let sum = 0;
    let finite = true;
    for (let p = 0; p < this.nParticles; p++) {
      const v = w[p]!;
      if (!Number.isFinite(v)) finite = false;
      else sum += v;
    }
    const ess = this.essOf(w);
    return {
      step: this.stepCount,
      observations: this.observationCount,
      nParticles: this.nParticles,
      nTeams: this.nTeams,
      dim: this.dim,
      ess,
      essFraction: ess / this.nParticles,
      resampleCount: this.resampleCountInternal,
      degenerateCount: this.degenerateCountInternal,
      weightSum: sum,
      weightsFinite: finite,
      priced: false,
      status: "shadow",
    };
  }

  // ============================================================
  // Internals
  // ============================================================

  private assertTeam(team: number, name: string): void {
    if (!Number.isInteger(team) || team < 0 || team >= this.nTeams) {
      throw new RangeError(
        `TeamStrengthFilter: ${name} must be an integer in [0, ${this.nTeams}), received ${String(team)}`,
      );
    }
  }

  /** Seeded standard normal (Box–Muller; u1 guarded away from 0 before the log). */
  /** One uniform in [0,1) from the serializable stream. */
  private nextRandom(): number {
    const step = mulberry32Step(this.rngState);
    this.rngState = step.state;
    return step.value;
  }

  private nextNormal(): number {
    const spare = this.spareNormal;
    if (spare !== null) {
      this.spareNormal = null;
      return spare;
    }
    const u1 = Math.max(this.nextRandom(), Number.EPSILON);
    const u2 = this.nextRandom();
    const radius = Math.sqrt(-2 * Math.log(u1));
    const theta = 2 * Math.PI * u2;
    this.spareNormal = radius * Math.sin(theta);
    return radius * Math.cos(theta);
  }

  /** Identified projection wᵀs for one (particle, team). */
  private project(p: number, team: number): number {
    const base = (p * this.nTeams + team) * this.dim;
    const s = this.states;
    let acc = 0;
    for (let d = 0; d < this.dim; d++) acc += this.loading[d]! * s[base + d]!;
    return acc;
  }

  /** Validate and accumulate interventions into a dense (nTeams × dim) drift, or null if none. */
  private buildDrift(interventions?: readonly TeamIntervention[]): Float64Array | null {
    if (interventions === undefined || interventions.length === 0) return null;
    const drift = new Float64Array(this.nTeams * this.dim);
    for (let k = 0; k < interventions.length; k++) {
      const iv = interventions[k];
      if (iv === undefined || iv === null) {
        throw new RangeError(`TeamStrengthFilter.predictStates: interventions[${k}] is missing`);
      }
      this.assertTeam(iv.team, `interventions[${k}].team`);
      const base = iv.team * this.dim;
      const delta = iv.delta;
      if (typeof delta === "number") {
        if (!Number.isFinite(delta)) {
          throw new RangeError(
            `TeamStrengthFilter.predictStates: interventions[${k}].delta must be finite, received ${String(delta)}`,
          );
        }
        const g = this.interventionGain * delta;
        for (let d = 0; d < this.dim; d++) drift[base + d] = drift[base + d]! + g;
        continue;
      }
      if (delta.length !== this.dim) {
        throw new RangeError(
          `TeamStrengthFilter.predictStates: interventions[${k}].delta vector must have length dim (${this.dim}), received ${delta.length}`,
        );
      }
      for (let d = 0; d < this.dim; d++) {
        const v = delta[d];
        if (v === undefined || !Number.isFinite(v)) {
          throw new RangeError(
            `TeamStrengthFilter.predictStates: interventions[${k}].delta[${d}] must be finite, received ${String(v)}`,
          );
        }
        drift[base + d] = drift[base + d]! + this.interventionGain * v;
      }
    }
    return drift;
  }

  /** Reset to an uninformative, exactly-uniform posterior. */
  private setUniformWeights(): void {
    this.logWeights.fill(0);
    this.weightBuf.fill(1 / this.nParticles);
  }

  /**
   * Subtract the running maximum from the stored log weights so their max is
   * exactly 0 — the whole reason this filter cannot underflow. If no finite
   * maximum exists the posterior has collapsed: degrade honestly to uniform and
   * count it, rather than propagating NaN.
   */
  private recentreLogWeights(): void {
    const n = this.nParticles;
    const lw = this.logWeights;
    let max = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < n; i++) {
      const v = lw[i]!;
      if (Number.isFinite(v) && v > max) max = v;
    }
    if (!Number.isFinite(max)) {
      this.setUniformWeights();
      this.degenerateCountInternal += 1;
      return;
    }
    for (let i = 0; i < n; i++) {
      const v = lw[i]!;
      lw[i] = Number.isFinite(v) ? v - max : Number.NEGATIVE_INFINITY;
    }
  }

  /**
   * Rebuild `weightBuf` as normalised linear weights from `logWeights`.
   * NaN/−Infinity log weights exponentiate to 0 (a dead particle) rather than
   * poisoning the sum. A zero or non-finite total is a collapse: reset to
   * uniform and count it.
   */
  private syncWeights(): void {
    const n = this.nParticles;
    const lw = this.logWeights;
    const wb = this.weightBuf;
    let max = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < n; i++) {
      const v = lw[i]!;
      if (Number.isFinite(v) && v > max) max = v;
    }
    if (!Number.isFinite(max)) {
      this.setUniformWeights();
      this.degenerateCountInternal += 1;
      return;
    }
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const v = lw[i]!;
      const e = Number.isFinite(v) ? Math.exp(v - max) : 0;
      wb[i] = e;
      sum += e;
    }
    if (!(sum > 0) || !Number.isFinite(sum)) {
      this.setUniformWeights();
      this.degenerateCountInternal += 1;
      return;
    }
    for (let i = 0; i < n; i++) wb[i] = wb[i]! / sum;
  }

  /** ESS = 1/Σw² for an already-normalised weight vector. */
  private essOf(w: Float64Array): number {
    let s2 = 0;
    for (let i = 0; i < this.nParticles; i++) {
      const v = w[i]!;
      s2 += v * v;
    }
    return s2 > 0 ? 1 / s2 : 0;
  }

  /** Draw parent indices, copy the cloud into the scratch buffer, swap, reset weights. */
  private resample(): void {
    const idx = this.indexBuf;
    if (this.resampling === "systematic") this.systematicIndices(this.weightBuf, idx);
    else this.multinomialIndices(this.weightBuf, idx);

    const stride = this.nTeams * this.dim;
    const src = this.states;
    const dst = this.scratch;
    for (let j = 0; j < this.nParticles; j++) {
      const from = idx[j]!;
      const off = from * stride;
      // Written into a SEPARATE buffer: an in-place copy would clobber a parent
      // that a later child still needs.
      dst.set(src.subarray(off, off + stride), j * stride);
    }
    this.states = dst;
    this.scratch = src;
    this.setUniformWeights();
    this.resampleCountInternal += 1;
  }

  /**
   * Systematic resampling: one uniform u0 ~ U[0, 1/N), strata u_j = u0 + j/N.
   * Emits exactly N indices. The `i < n − 1` clamp is load-bearing: Σw can land
   * a few ULPs below 1.0, and without it the final stratum walks past the end.
   */
  private systematicIndices(w: Float64Array, out: Int32Array): void {
    const n = this.nParticles;
    const u0 = this.nextRandom() / n;
    let i = 0;
    let cum = w[0]!;
    for (let j = 0; j < n; j++) {
      const u = u0 + j / n;
      while (u > cum && i < n - 1) {
        i += 1;
        cum += w[i]!;
      }
      out[j] = i;
    }
  }

  /**
   * Multinomial resampling: N independent draws against the cumulative weights,
   * located by binary search (O(N log N), fine at N = 1000). Emits exactly N
   * indices; a non-positive total degrades to the identity permutation, which is
   * an honest no-op rather than a silent NaN cloud.
   */
  private multinomialIndices(w: Float64Array, out: Int32Array): void {
    const n = this.nParticles;
    const cum = this.cumBuf;
    let acc = 0;
    for (let i = 0; i < n; i++) {
      acc += w[i]!;
      cum[i] = acc;
    }
    const total = cum[n - 1]!;
    if (!(total > 0) || !Number.isFinite(total)) {
      for (let j = 0; j < n; j++) out[j] = j;
      return;
    }
    for (let j = 0; j < n; j++) {
      const u = this.nextRandom() * total;
      let lo = 0;
      let hi = n - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cum[mid]! < u) lo = mid + 1;
        else hi = mid;
      }
      out[j] = lo;
    }
  }
}
