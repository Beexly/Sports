/**
 * Hierarchical NB Rao-Blackwellized particle filter — R-9 shadow engine.
 *
 * Extends the HOUSE FILTER CONVENTIONS in team-strength-filter.ts rather than
 * inventing a second style:
 *   - seed is REQUIRED; no Math.random / Date.now
 *   - mulberry32 as a (state)->(state,value) step so snapshot/restore can
 *     continue the same stream (serverless rehydration)
 *   - log-space weights, re-centred to max 0; degeneracy resets to uniform
 *     and never emits NaN
 *   - ESS-triggered systematic resampling (same two traps: clamp last index,
 *     write into a separate buffer)
 *   - diagnostics.priced is the literal false; status is "shadow"
 *
 * Layering (load-bearing, from the audited spec):
 *   1. Particles carry discrete type assignments (team/pitcher/park/umpire).
 *   2. Given those assignments, linear coefficients β are the Laplace
 *      approximation to the NB conditional (warm-started Newton, analytic
 *      Hessian). Optional cubature is OFF by default — the Laplace mode is
 *      the primary path.
 *   3. Liu-West (2001) on LOG-scale variance components (log φ, log ridge)
 *      runs AFTER weighting and BEFORE resampling.
 *
 * Grok sandbox artifacts are spec references only. Nothing is imported from
 * them. The sandbox capital figure is not cited anywhere in this directory.
 *
 * PURE: no fs, no network, no env, no feature-flag reads.
 */

import type { SyntheticGame } from "./synthetic-nb.js";

export const R9_SNAPSHOT_VERSION = 1 as const;
export const FIXED_LAMBDA = 0.3;
export const MAX_PARTICLES = 512;
export const MAX_UNITS = 64;
const N_TYPES = 2;
const BETA_DIM = 7; // intercept + 6 type-1 dummies
const MAX_Y = 40;
const NEWTON_STEPS = 6;

export type ResamplingScheme = "systematic" | "multinomial";

export interface NbRbpfOptions {
  readonly seed: number;
  readonly nTeams: number;
  readonly nPitchers: number;
  readonly nParks: number;
  readonly nUmpires: number;
  readonly nParticles?: number;
  readonly essThreshold?: number;
  readonly resampling?: ResamplingScheme;
  readonly liuWestDelta?: number;
}

export interface NbRbpfSnapshot {
  readonly version: typeof R9_SNAPSHOT_VERSION;
  readonly nTeams: number;
  readonly nPitchers: number;
  readonly nParks: number;
  readonly nUmpires: number;
  readonly nParticles: number;
  readonly essThreshold: number;
  readonly resampling: ResamplingScheme;
  readonly liuWestDelta: number;
  readonly seed: number;
  readonly assignments: readonly number[];
  readonly logPhi: readonly number[];
  readonly logRidge: readonly number[];
  readonly beta: readonly number[];
  readonly logWeights: readonly number[];
  readonly rngState: number;
  readonly spareNormal: number | null;
  readonly observations: number;
  readonly resampleCount: number;
  readonly degenerateCount: number;
  readonly games: readonly SyntheticGame[];
}

export interface NbRbpfDiagnostics {
  readonly observations: number;
  readonly nParticles: number;
  readonly ess: number;
  readonly essFraction: number;
  readonly resampleCount: number;
  readonly degenerateCount: number;
  readonly weightSum: number;
  readonly weightsFinite: boolean;
  readonly priced: false;
  readonly status: "shadow";
}

function mulberry32Step(state: number): { readonly state: number; readonly value: number } {
  let a = (state | 0) + 0x6d2b79f5;
  a |= 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { state: a, value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
}

function requireInteger(value: number, name: string, lo: number, hi: number): number {
  if (!Number.isInteger(value) || value < lo || value > hi) {
    throw new RangeError(`NbRbpf: ${name} must be an integer in [${lo}, ${hi}], received ${String(value)}`);
  }
  return value;
}

function requireFinite(value: number, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RangeError(`NbRbpf: ${name} must be a finite number, received ${String(value)}`);
  }
  return value;
}

function logFact(y: number): number {
  let s = 0;
  for (let k = 2; k <= y; k++) s += Math.log(k);
  return s;
}

/** log NB2 pmf at integer y. Never returns NaN — degenerates to a large negative. */
export function logNbPmf(y: number, mu: number, phi: number): number {
  if (!Number.isFinite(y) || y < 0 || !Number.isFinite(mu) || mu <= 0 || !Number.isFinite(phi) || phi <= 0) {
    return -1e12;
  }
  let rising = 0;
  for (let k = 0; k < y; k++) rising += Math.log(phi + k);
  const v = rising - logFact(y) + phi * Math.log(phi) - phi * Math.log(phi + mu) + y * Math.log(mu) - y * Math.log(phi + mu);
  return Number.isFinite(v) ? v : -1e12;
}

function nbOverProb(mu: number, phi: number, line: number): number {
  let cdf = 0;
  for (let y = 0; y <= Math.floor(line); y++) {
    const lp = logNbPmf(y, mu, phi);
    cdf += Math.exp(lp);
  }
  if (!Number.isFinite(cdf)) return 0.5;
  return Math.min(1 - 1e-6, Math.max(1e-6, 1 - cdf));
}

/** In-place Gaussian elimination: solve H x = g, H is dim×dim row-major. Returns false on collapse. */
function solveNxN(h: Float64Array, g: Float64Array, x: Float64Array, dim: number): boolean {
  const a = new Float64Array(dim * (dim + 1));
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) a[i * (dim + 1) + j] = h[i * dim + j]!;
    a[i * (dim + 1) + dim] = g[i]!;
  }
  for (let col = 0; col < dim; col++) {
    let piv = col;
    let best = Math.abs(a[col * (dim + 1) + col]!);
    for (let r = col + 1; r < dim; r++) {
      const v = Math.abs(a[r * (dim + 1) + col]!);
      if (v > best) {
        best = v;
        piv = r;
      }
    }
    if (!(best > 1e-12)) return false;
    if (piv !== col) {
      for (let j = col; j <= dim; j++) {
        const tmp = a[col * (dim + 1) + j]!;
        a[col * (dim + 1) + j] = a[piv * (dim + 1) + j]!;
        a[piv * (dim + 1) + j] = tmp;
      }
    }
    const diag = a[col * (dim + 1) + col]!;
    for (let r = col + 1; r < dim; r++) {
      const f = a[r * (dim + 1) + col]! / diag;
      for (let j = col; j <= dim; j++) {
        a[r * (dim + 1) + j] = a[r * (dim + 1) + j]! - f * a[col * (dim + 1) + j]!;
      }
    }
  }
  for (let i = dim - 1; i >= 0; i--) {
    let s = a[i * (dim + 1) + dim]!;
    for (let j = i + 1; j < dim; j++) s -= a[i * (dim + 1) + j]! * x[j]!;
    const d = a[i * (dim + 1) + i]!;
    if (!(Math.abs(d) > 1e-12)) return false;
    x[i] = s / d;
  }
  return true;
}

export class NbRbpf {
  readonly nTeams: number;
  readonly nPitchers: number;
  readonly nParks: number;
  readonly nUmpires: number;
  readonly nParticles: number;
  readonly essThreshold: number;
  readonly resampling: ResamplingScheme;
  readonly liuWestDelta: number;
  readonly seed: number;

  /** Discrete type assignments, particle-major then unit. */
  private assignments: Int32Array;
  private scratchAssign: Int32Array;
  private readonly logPhi: Float64Array;
  private readonly logRidge: Float64Array;
  private readonly beta: Float64Array; // nParticles * BETA_DIM
  private readonly logWeights: Float64Array;
  private readonly weightBuf: Float64Array;
  private readonly indexBuf: Int32Array;
  private readonly cumBuf: Float64Array;

  private readonly games: SyntheticGame[] = [];

  private rngState: number;
  private spareNormal: number | null = null;
  private observationCount = 0;
  private resampleCountInternal = 0;
  private degenerateCountInternal = 0;

  constructor(options: NbRbpfOptions) {
    if (options === null || typeof options !== "object") {
      throw new RangeError("NbRbpf: options object is required");
    }
    this.nTeams = requireInteger(options.nTeams, "nTeams", 2, MAX_UNITS);
    this.nPitchers = requireInteger(options.nPitchers, "nPitchers", 1, MAX_UNITS);
    this.nParks = requireInteger(options.nParks, "nParks", 1, MAX_UNITS);
    this.nUmpires = requireInteger(options.nUmpires, "nUmpires", 1, MAX_UNITS);
    this.nParticles = requireInteger(options.nParticles ?? 32, "nParticles", 1, MAX_PARTICLES);
    this.seed = requireFinite(options.seed, "seed") >>> 0;
    const essThreshold = requireFinite(options.essThreshold ?? 0.5, "essThreshold");
    if (!(essThreshold > 0) || essThreshold > 1) {
      throw new RangeError(`NbRbpf: essThreshold must lie in (0, 1], received ${essThreshold}`);
    }
    this.essThreshold = essThreshold;
    const resampling = options.resampling ?? "systematic";
    if (resampling !== "systematic" && resampling !== "multinomial") {
      throw new RangeError(`NbRbpf: unknown resampling scheme "${String(resampling)}"`);
    }
    this.resampling = resampling;
    const liuWestDelta = requireFinite(options.liuWestDelta ?? 0.99, "liuWestDelta");
    if (!(liuWestDelta > 0) || liuWestDelta > 1) {
      throw new RangeError(`NbRbpf: liuWestDelta must lie in (0, 1], received ${liuWestDelta}`);
    }
    this.liuWestDelta = liuWestDelta;

    const assignLen = this.nParticles * this.assignStride();
    this.assignments = new Int32Array(assignLen);
    this.scratchAssign = new Int32Array(assignLen);
    this.logPhi = new Float64Array(this.nParticles);
    this.logRidge = new Float64Array(this.nParticles);
    this.beta = new Float64Array(this.nParticles * BETA_DIM);
    this.logWeights = new Float64Array(this.nParticles);
    this.weightBuf = new Float64Array(this.nParticles);
    this.indexBuf = new Int32Array(this.nParticles);
    this.cumBuf = new Float64Array(this.nParticles);
    this.rngState = this.seed;
    this.initCloud();
  }

  private assignStride(): number {
    return this.nTeams + this.nPitchers + this.nParks + this.nUmpires;
  }

  private initCloud(): void {
    const stride = this.assignStride();
    for (let p = 0; p < this.nParticles; p++) {
      const off = p * stride;
      for (let i = 0; i < stride; i++) this.assignments[off + i] = this.nextRandom() < 1 / N_TYPES ? 0 : 1;
      this.logPhi[p] = Math.log(12);
      this.logRidge[p] = Math.log(4);
      const bOff = p * BETA_DIM;
      this.beta[bOff] = Math.log(8.5);
      this.logWeights[p] = 0;
    }
    this.weightBuf.fill(1 / this.nParticles);
  }

  /**
   * Predictive P(Y > line) as a mixture over particles. Computed BEFORE update.
   * Shrinkage toward 0.5 is applied by the caller (capital.ts), not here.
   */
  predictOver(game: SyntheticGame): number {
    this.syncWeights();
    let p = 0;
    for (let i = 0; i < this.nParticles; i++) {
      const mu = Math.exp(this.eta(i, game));
      const phi = Math.exp(this.logPhi[i]!);
      p += this.weightBuf[i]! * nbOverProb(mu, phi, game.line);
    }
    if (!Number.isFinite(p)) return 0.5;
    return Math.min(1 - 1e-6, Math.max(1e-6, p));
  }

  /**
   * Weight by the NB likelihood of `game.y`, then Liu-West the log-variance
   * components, then resample if ESS is low. Order is load-bearing.
   */
  update(game: SyntheticGame): void {
    if (!Number.isInteger(game.y) || game.y < 0) {
      throw new RangeError(`NbRbpf.update: y must be a non-negative integer, received ${String(game.y)}`);
    }
    this.assertUnit(game.home, this.nTeams, "home");
    this.assertUnit(game.away, this.nTeams, "away");
    this.assertUnit(game.pitcherHome, this.nPitchers, "pitcherHome");
    this.assertUnit(game.pitcherAway, this.nPitchers, "pitcherAway");
    this.assertUnit(game.park, this.nParks, "park");
    this.assertUnit(game.umpire, this.nUmpires, "umpire");

    this.games.push(game);

    for (let i = 0; i < this.nParticles; i++) {
      this.fitLaplace(i);
      const mu = Math.exp(this.eta(i, game));
      const phi = Math.exp(this.logPhi[i]!);
      const ll = logNbPmf(game.y, mu, phi);
      this.logWeights[i] = this.logWeights[i]! + ll;
    }
    this.recentreLogWeights();
    this.syncWeights();

    // Liu-West AFTER weighting, BEFORE resampling.
    this.liuWestLogVariance();

    const ess = this.essOf(this.weightBuf);
    if (ess < this.nParticles * this.essThreshold) this.resample();

    this.observationCount += 1;
  }

  snapshot(): NbRbpfSnapshot {
    return {
      version: R9_SNAPSHOT_VERSION,
      nTeams: this.nTeams,
      nPitchers: this.nPitchers,
      nParks: this.nParks,
      nUmpires: this.nUmpires,
      nParticles: this.nParticles,
      essThreshold: this.essThreshold,
      resampling: this.resampling,
      liuWestDelta: this.liuWestDelta,
      seed: this.seed,
      assignments: Array.from(this.assignments),
      logPhi: Array.from(this.logPhi),
      logRidge: Array.from(this.logRidge),
      beta: Array.from(this.beta),
      logWeights: Array.from(this.logWeights),
      rngState: this.rngState,
      spareNormal: this.spareNormal,
      observations: this.observationCount,
      resampleCount: this.resampleCountInternal,
      degenerateCount: this.degenerateCountInternal,
      games: this.games.map((g) => ({ ...g })),
    };
  }

  static restore(snapshot: NbRbpfSnapshot): NbRbpf {
    if (snapshot === null || typeof snapshot !== "object") {
      throw new RangeError("NbRbpf.restore: snapshot object is required");
    }
    if (snapshot.version !== R9_SNAPSHOT_VERSION) {
      throw new RangeError(
        `NbRbpf.restore: snapshot version ${String(snapshot.version)} is not ${R9_SNAPSHOT_VERSION}`,
      );
    }
    const filter = new NbRbpf({
      nTeams: snapshot.nTeams,
      nPitchers: snapshot.nPitchers,
      nParks: snapshot.nParks,
      nUmpires: snapshot.nUmpires,
      nParticles: snapshot.nParticles,
      seed: snapshot.seed,
      essThreshold: snapshot.essThreshold,
      resampling: snapshot.resampling,
      liuWestDelta: snapshot.liuWestDelta,
    });
    if (snapshot.assignments.length !== filter.assignments.length) {
      throw new RangeError("NbRbpf.restore: assignments length mismatch");
    }
    if (snapshot.logWeights.length !== snapshot.nParticles) {
      throw new RangeError("NbRbpf.restore: logWeights length mismatch");
    }
    filter.assignments.set(snapshot.assignments);
    filter.logPhi.set(snapshot.logPhi);
    filter.logRidge.set(snapshot.logRidge);
    filter.beta.set(snapshot.beta);
    filter.logWeights.set(snapshot.logWeights);
    filter.rngState = snapshot.rngState >>> 0;
    filter.spareNormal = snapshot.spareNormal;
    filter.observationCount = snapshot.observations;
    filter.resampleCountInternal = snapshot.resampleCount;
    filter.degenerateCountInternal = snapshot.degenerateCount;
    filter.games.length = 0;
    for (const g of snapshot.games) filter.games.push(g);
    return filter;
  }

  diagnostics(): NbRbpfDiagnostics {
    this.syncWeights();
    let sum = 0;
    let finite = true;
    for (let i = 0; i < this.nParticles; i++) {
      const v = this.weightBuf[i]!;
      if (!Number.isFinite(v)) finite = false;
      else sum += v;
    }
    const ess = this.essOf(this.weightBuf);
    return {
      observations: this.observationCount,
      nParticles: this.nParticles,
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

  private assertUnit(v: number, n: number, name: string): void {
    if (!Number.isInteger(v) || v < 0 || v >= n) {
      throw new RangeError(`NbRbpf: ${name} must be an integer in [0, ${n}), received ${String(v)}`);
    }
  }

  private typeOf(particle: number, kind: "team" | "pitcher" | "park" | "umpire", id: number): number {
    const stride = this.assignStride();
    let base = particle * stride;
    if (kind === "team") return this.assignments[base + id]!;
    base += this.nTeams;
    if (kind === "pitcher") return this.assignments[base + id]!;
    base += this.nPitchers;
    if (kind === "park") return this.assignments[base + id]!;
    base += this.nParks;
    return this.assignments[base + id]!;
  }

  /** Design row: [1, homeT1, awayT1, pitHT1, pitAT1, parkT1, umpT1] */
  private fillX(particle: number, game: SyntheticGame, x: Float64Array): void {
    x[0] = 1;
    x[1] = this.typeOf(particle, "team", game.home);
    x[2] = this.typeOf(particle, "team", game.away);
    x[3] = this.typeOf(particle, "pitcher", game.pitcherHome);
    x[4] = this.typeOf(particle, "pitcher", game.pitcherAway);
    x[5] = this.typeOf(particle, "park", game.park);
    x[6] = this.typeOf(particle, "umpire", game.umpire);
  }

  private eta(particle: number, game: SyntheticGame): number {
    const x = new Float64Array(BETA_DIM);
    this.fillX(particle, game, x);
    let s = 0;
    const bOff = particle * BETA_DIM;
    for (let d = 0; d < BETA_DIM; d++) s += x[d]! * this.beta[bOff + d]!;
    return s;
  }

  /**
   * Warm-started Newton on the NB log-likelihood for this particle's discrete
   * assignment, ridge = exp(logRidge). Analytic Hessian. If Newton collapses,
   * keep the previous β — never write NaN.
   */
  private fitLaplace(particle: number): void {
    const n = this.games.length;
    if (n === 0) return;
    const game = this.games[n - 1]!;
    const phi = Math.exp(this.logPhi[particle]!);
    const ridge = Math.exp(this.logRidge[particle]!);
    const bOff = particle * BETA_DIM;
    const beta = new Float64Array(BETA_DIM);
    for (let d = 0; d < BETA_DIM; d++) beta[d] = this.beta[bOff + d]!;
    const x = new Float64Array(BETA_DIM);
    const g = new Float64Array(BETA_DIM);
    const h = new Float64Array(BETA_DIM * BETA_DIM);
    const step = new Float64Array(BETA_DIM);

    for (let iter = 0; iter < NEWTON_STEPS; iter++) {
      g.fill(0);
      h.fill(0);
      for (let d = 0; d < BETA_DIM; d++) h[d * BETA_DIM + d] = -1 / ridge;
      this.fillX(particle, game, x);
      let eta = 0;
      for (let d = 0; d < BETA_DIM; d++) eta += x[d]! * beta[d]!;
      const mu = Math.exp(Math.min(6, Math.max(-2, eta)));
      const denom = phi + mu;
      const dldeta = ((game.y - mu) * phi) / denom;
      const d2 = (-mu * phi * (phi + game.y)) / (denom * denom);
      for (let i = 0; i < BETA_DIM; i++) {
        g[i] = g[i]! + dldeta * x[i]!;
        for (let j = 0; j < BETA_DIM; j++) {
          h[i * BETA_DIM + j] = h[i * BETA_DIM + j]! + d2 * x[i]! * x[j]!;
        }
      }
      if (!solveNxN(h, g, step, BETA_DIM)) return;
      let ok = true;
      for (let d = 0; d < BETA_DIM; d++) {
        const next = beta[d]! - step[d]!;
        if (!Number.isFinite(next)) {
          ok = false;
          break;
        }
        beta[d] = next;
      }
      if (!ok) return;
    }
    for (let d = 0; d < BETA_DIM; d++) this.beta[bOff + d] = beta[d]!;
  }

  /**
   * Liu-West kernel on (log φ, log ridge). a = (3δ−1)/(2δ). Applied to the
   * weighted cloud; does not touch discrete assignments or β.
   */
  private liuWestLogVariance(): void {
    const n = this.nParticles;
    const w = this.weightBuf;
    let mPhi = 0;
    let mRidge = 0;
    for (let i = 0; i < n; i++) {
      mPhi += w[i]! * this.logPhi[i]!;
      mRidge += w[i]! * this.logRidge[i]!;
    }
    let vPhi = 0;
    let vRidge = 0;
    for (let i = 0; i < n; i++) {
      const dp = this.logPhi[i]! - mPhi;
      const dr = this.logRidge[i]! - mRidge;
      vPhi += w[i]! * dp * dp;
      vRidge += w[i]! * dr * dr;
    }
    const delta = this.liuWestDelta;
    const a = (3 * delta - 1) / (2 * delta);
    const shrink = Math.sqrt(Math.max(0, 1 - a * a));
    const sdPhi = Math.sqrt(Math.max(vPhi, 1e-8));
    const sdRidge = Math.sqrt(Math.max(vRidge, 1e-8));
    for (let i = 0; i < n; i++) {
      this.logPhi[i] = a * this.logPhi[i]! + (1 - a) * mPhi + shrink * sdPhi * this.nextNormal();
      this.logRidge[i] = a * this.logRidge[i]! + (1 - a) * mRidge + shrink * sdRidge * this.nextNormal();
      if (!Number.isFinite(this.logPhi[i]!)) this.logPhi[i] = Math.log(12);
      if (!Number.isFinite(this.logRidge[i]!)) this.logRidge[i] = Math.log(4);
    }
  }

  private setUniformWeights(): void {
    this.logWeights.fill(0);
    this.weightBuf.fill(1 / this.nParticles);
  }

  private recentreLogWeights(): void {
    const n = this.nParticles;
    let max = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < n; i++) {
      const v = this.logWeights[i]!;
      if (Number.isFinite(v) && v > max) max = v;
    }
    if (!Number.isFinite(max)) {
      this.setUniformWeights();
      this.degenerateCountInternal += 1;
      return;
    }
    for (let i = 0; i < n; i++) {
      const v = this.logWeights[i]!;
      this.logWeights[i] = Number.isFinite(v) ? v - max : Number.NEGATIVE_INFINITY;
    }
  }

  private syncWeights(): void {
    const n = this.nParticles;
    let max = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < n; i++) {
      const v = this.logWeights[i]!;
      if (Number.isFinite(v) && v > max) max = v;
    }
    if (!Number.isFinite(max)) {
      this.setUniformWeights();
      this.degenerateCountInternal += 1;
      return;
    }
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const v = this.logWeights[i]!;
      const e = Number.isFinite(v) ? Math.exp(v - max) : 0;
      this.weightBuf[i] = e;
      sum += e;
    }
    if (!(sum > 0) || !Number.isFinite(sum)) {
      this.setUniformWeights();
      this.degenerateCountInternal += 1;
      return;
    }
    for (let i = 0; i < n; i++) this.weightBuf[i] = this.weightBuf[i]! / sum;
  }

  private essOf(w: Float64Array): number {
    let s2 = 0;
    for (let i = 0; i < this.nParticles; i++) {
      const v = w[i]!;
      s2 += v * v;
    }
    return s2 > 0 ? 1 / s2 : 0;
  }

  private resample(): void {
    if (this.resampling === "systematic") this.systematicIndices(this.weightBuf, this.indexBuf);
    else this.multinomialIndices(this.weightBuf, this.indexBuf);
    const stride = this.assignStride();
    const src = this.assignments;
    const dst = this.scratchAssign;
    const newPhi = new Float64Array(this.nParticles);
    const newRidge = new Float64Array(this.nParticles);
    const newBeta = new Float64Array(this.nParticles * BETA_DIM);
    for (let j = 0; j < this.nParticles; j++) {
      const from = this.indexBuf[j]!;
      dst.set(src.subarray(from * stride, from * stride + stride), j * stride);
      newPhi[j] = this.logPhi[from]!;
      newRidge[j] = this.logRidge[from]!;
      newBeta.set(this.beta.subarray(from * BETA_DIM, from * BETA_DIM + BETA_DIM), j * BETA_DIM);
    }
    this.assignments = dst;
    this.scratchAssign = src;
    this.logPhi.set(newPhi);
    this.logRidge.set(newRidge);
    this.beta.set(newBeta);
    this.setUniformWeights();
    this.resampleCountInternal += 1;
  }

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

  private multinomialIndices(w: Float64Array, out: Int32Array): void {
    const n = this.nParticles;
    let acc = 0;
    for (let i = 0; i < n; i++) {
      acc += w[i]!;
      this.cumBuf[i] = acc;
    }
    const total = this.cumBuf[n - 1]!;
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
        if (this.cumBuf[mid]! < u) lo = mid + 1;
        else hi = mid;
      }
      out[j] = lo;
    }
  }

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
    let u1 = this.nextRandom();
    if (u1 < 1e-12) u1 = 1e-12;
    const u2 = this.nextRandom();
    const r = Math.sqrt(-2 * Math.log(u1));
    const theta = 2 * Math.PI * u2;
    this.spareNormal = r * Math.sin(theta);
    return r * Math.cos(theta);
  }
}
