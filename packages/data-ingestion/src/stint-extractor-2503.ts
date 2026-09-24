/**
 * Tracking entity schema + event/stint extraction + sim-to-real MMD gap
 *
 * Research port: arXiv:2503.19809
 * Normalized lane: experimental | Doctrine: PROPRIETARY_EDGE
 *
 * Pure engineering port of the paper's entity schema for the NGS pipeline:
 * frames -> plays (stints) -> per-stint event summaries. Closes the paper's
 * admitted sim-to-real gap quantitatively with MMD on player-velocity and
 * spacing distributions between simulated and real frames; the MMD value is
 * the transferability score gating which model classes are safe to prototype
 * in simulation. No simulator dependency — the extractor runs on real NGS
 * frames today.
 *
 * ACCEPTANCE GATE: Adopt the entity-schema + event/stint extraction layer for
 * GSE's NGS pipeline if the reproducible test passes (pure engineering with
 * no downside); adopt the simulation-first prototyping lane only after
 * identifying a football simulator with adequate behavioral realism.
 */

export interface PlayerObservation {
  playerId: string;
  team: "offense" | "defense" | "ball";
  x: number;
  y: number;
  /** yards per second */
  speed: number;
  /** direction of travel in radians */
  direction: number;
}

export interface TrackingFrame {
  frameId: number;
  gameId: string;
  playId: string;
  timestamp: number;
  players: PlayerObservation[];
}

export interface StintSummary {
  playId: string;
  gameId: string;
  frameCount: number;
  durationS: number;
  /** per-player mean speed over the stint */
  meanSpeeds: number[];
  /** mean pairwise spacing (yards) sampled across frames */
  meanSpacings: number[];
  maxSpeed: number;
}

function pairwiseMeanSpacing(players: PlayerObservation[]): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i];
      const b = players[j];
      if (!a || !b) continue;
      sum += Math.hypot(a.x - b.x, a.y - b.y);
      n++;
    }
  }
  return n === 0 ? 0 : sum / n;
}

/** Group frames into per-play stints and extract event summaries. */
export function extractStints(frames: TrackingFrame[]): StintSummary[] {
  const byPlay = new Map<string, TrackingFrame[]>();
  for (const f of frames) {
    const list = byPlay.get(f.playId);
    if (list) list.push(f);
    else byPlay.set(f.playId, [f]);
  }
  const stints: StintSummary[] = [];
  for (const [playId, playFrames] of byPlay) {
    const sorted = [...playFrames].sort((a, b) => a.timestamp - b.timestamp);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last) continue;
    const speedByPlayer = new Map<string, number[]>();
    const spacings: number[] = [];
    let maxSpeed = 0;
    for (const f of sorted) {
      spacings.push(pairwiseMeanSpacing(f.players));
      for (const p of f.players) {
        if (!Number.isFinite(p.speed) || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
        maxSpeed = Math.max(maxSpeed, p.speed);
        const arr = speedByPlayer.get(p.playerId);
        if (arr) arr.push(p.speed);
        else speedByPlayer.set(p.playerId, [p.speed]);
      }
    }
    const meanSpeeds = [...speedByPlayer.values()].map((arr) =>
      arr.reduce((s, v) => s + v, 0) / arr.length,
    );
    stints.push({
      playId,
      gameId: first.gameId,
      frameCount: sorted.length,
      durationS: last.timestamp - first.timestamp,
      meanSpeeds,
      meanSpacings: spacings,
      maxSpeed,
    });
  }
  return stints.sort((a, b) => a.playId.localeCompare(b.playId));
}

function rbfKernel(a: number[], b: number[], gamma: number): number {
  let d = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    d += (x - y) * (x - y);
  }
  return Math.exp(-gamma * d);
}

function kernelMean(xs: number[][], ys: number[][], gamma: number): number {
  if (xs.length === 0 || ys.length === 0) return 0;
  let sum = 0;
  for (const x of xs) for (const y of ys) sum += rbfKernel(x, y, gamma);
  return sum / (xs.length * ys.length);
}

/** Squared MMD with RBF kernel between two samples of equal-dim vectors. */
export function mmdSquared(xs: number[][], ys: number[][], gamma = 0.5): number {
  if (xs.length === 0 || ys.length === 0) return Number.NaN;
  const kxx = kernelMean(xs, xs, gamma);
  const kyy = kernelMean(ys, ys, gamma);
  const kxy = kernelMean(xs, ys, gamma);
  return Math.max(0, kxx + kyy - 2 * kxy);
}

export interface SimToRealGap {
  velocityMmd: number;
  spacingMmd: number;
  /** combined transferability score: lower = safer to prototype in sim */
  transferabilityScore: number;
}

function toVectors(values: number[][]): number[][] {
  const dim = Math.max(0, ...values.map((v) => v.length));
  return values.map((v) => {
    const out = new Array<number>(dim).fill(0);
    for (let i = 0; i < v.length; i++) out[i] = v[i] ?? 0;
    return out;
  });
}

/**
 * MMD on player-velocity and spacing distributions between simulated and
 * real NGS frames — the paper's admitted gap, closed quantitatively.
 */
export function simToRealGap(real: StintSummary[], sim: StintSummary[]): SimToRealGap {
  const velocityMmd = mmdSquared(
    toVectors(real.map((s) => s.meanSpeeds)),
    toVectors(sim.map((s) => s.meanSpeeds)),
  );
  const spacingMmd = mmdSquared(
    toVectors(real.map((s) => s.meanSpacings)),
    toVectors(sim.map((s) => s.meanSpacings)),
  );
  return {
    velocityMmd,
    spacingMmd,
    transferabilityScore:
      Number.isNaN(velocityMmd) || Number.isNaN(spacingMmd)
        ? Number.NaN
        : (velocityMmd + spacingMmd) / 2,
  };
}

export const GSE_STINT_EXTRACTION_ENABLED = false;
