/**
 * Synthetic negative-binomial totals generator — R-9 only.
 *
 * HARD RULE: this module never reads a file, env var, database, or odds
 * archive. Every row is drawn from a seeded stream. Track E is closed (C-44);
 * real game tables are out of scope here, not "later."
 *
 * Under the null, every latent effect is exactly 0 and the market line equals
 * the true mean, so a calibrated engine's e-process is a martingale. Under
 * the planted-edge arm, team/pitcher/park/umpire effects are nonzero and the
 * market still prices the intercept-only mean — that is the only place skill
 * can appear.
 */

function mulberry32Step(state: number): { readonly state: number; readonly value: number } {
  let a = (state | 0) + 0x6d2b79f5;
  a |= 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { state: a, value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
}

export interface SyntheticGame {
  readonly home: number;
  readonly away: number;
  readonly pitcherHome: number;
  readonly pitcherAway: number;
  readonly park: number;
  readonly umpire: number;
  /** Combined total (integer ≥ 0). */
  readonly y: number;
  /** Market line the e-process bets against (intercept-only mean). */
  readonly line: number;
}

export interface SyntheticDesign {
  readonly nTeams: number;
  readonly nPitchers: number;
  readonly nParks: number;
  readonly nUmpires: number;
  readonly nGames: number;
  readonly intercept: number;
  readonly phi: number;
  readonly planted: boolean;
}

export const DEFAULT_DESIGN: SyntheticDesign = {
  nTeams: 8,
  nPitchers: 8,
  nParks: 4,
  nUmpires: 4,
  nGames: 80,
  intercept: Math.log(8.5),
  phi: 12,
  planted: false,
};

function nextRandom(rng: { state: number }): number {
  const step = mulberry32Step(rng.state);
  rng.state = step.state;
  return step.value;
}

function nextInt(rng: { state: number }, n: number): number {
  return Math.floor(nextRandom(rng) * n);
}

/** Inverse-CDF draw from NB2(μ, φ): var = μ + μ²/φ. */
function drawNb(rng: { state: number }, mu: number, phi: number): number {
  const p = phi / (phi + mu);
  // Gamma(φ, (1-p)/p) then Poisson — Johnk/Marsaglia via sum of exponentials is
  // heavy; for small baseball-scale μ we walk the CDF. Hard-cap at 40.
  let cdf = 0;
  let mass = Math.pow(p, phi);
  if (!Number.isFinite(mass) || mass <= 0) mass = Number.MIN_VALUE;
  const u = nextRandom(rng);
  for (let y = 0; y <= 40; y++) {
    cdf += mass;
    if (u <= cdf) return y;
    mass *= ((phi + y) / (y + 1)) * (1 - p);
  }
  return 40;
}

function latent(rng: { state: number }, planted: boolean, n: number, scale: number): Float64Array {
  const v = new Float64Array(n);
  if (!planted) return v;
  for (let i = 0; i < n; i++) v[i] = (nextRandom(rng) * 2 - 1) * scale;
  return v;
}

export function generateSyntheticGames(seed: number, design: SyntheticDesign = DEFAULT_DESIGN): readonly SyntheticGame[] {
  if (!Number.isFinite(seed)) {
    throw new RangeError(`generateSyntheticGames: seed must be finite, received ${String(seed)}`);
  }
  const rng = { state: seed >>> 0 };
  const teamOff = latent(rng, design.planted, design.nTeams, 0.18);
  const teamDef = latent(rng, design.planted, design.nTeams, 0.12);
  const pitcher = latent(rng, design.planted, design.nPitchers, 0.1);
  const park = latent(rng, design.planted, design.nParks, 0.08);
  const umpire = latent(rng, design.planted, design.nUmpires, 0.05);
  const line = Math.exp(design.intercept);
  const games: SyntheticGame[] = [];
  for (let g = 0; g < design.nGames; g++) {
    let home = nextInt(rng, design.nTeams);
    let away = nextInt(rng, design.nTeams);
    if (away === home) away = (away + 1) % design.nTeams;
    const pitcherHome = nextInt(rng, design.nPitchers);
    const pitcherAway = nextInt(rng, design.nPitchers);
    const pk = nextInt(rng, design.nParks);
    const ump = nextInt(rng, design.nUmpires);
    const eta =
      design.intercept +
      (teamOff[home] ?? 0) +
      (teamDef[away] ?? 0) +
      (pitcher[pitcherHome] ?? 0) +
      (pitcher[pitcherAway] ?? 0) +
      (park[pk] ?? 0) +
      (umpire[ump] ?? 0);
    const y = drawNb(rng, Math.exp(eta), design.phi);
    games.push({ home, away, pitcherHome, pitcherAway, park: pk, umpire: ump, y, line });
  }
  return games;
}
