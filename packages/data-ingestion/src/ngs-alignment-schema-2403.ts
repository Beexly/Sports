/**
 * NGS tracking alignment schema: 22 players + ball at 10 Hz with play outcomes
 *
 * Research port: arXiv:2403.12977
 * Normalized lane: calibration | Doctrine: PROPRIETARY_EDGE
 *
 * Defines the aligned tracking record the multi-player gameplay generator needs: 22 players + ball at 10 Hz, frame timestamps aligned to play-level outcomes (EPA, win probability added). Schema + validation only; the generator's decoder is a live-data gate.
 *
 * ACCEPTANCE GATE: Adopt the simulation lane only if BOTH hold on Weeks 13-17: (a) generated yardage distributions achieve 1-Wasserstein distance <= 0.5 vs real, AND (b) play-outcome calibration passes. Live-data gate -> GSE_NGS_SIM_ENABLED flag (default false).
 */

export interface NgsFrame {
  frameId: number;
  /** seconds since play start; 10 Hz => 0.1 spacing */
  t: number;
  /** 22 players + ball: x, y in yards */
  entities: { x: number; y: number }[];
}

export interface AlignedPlay {
  playId: string;
  gameId: string;
  frames: NgsFrame[];
  epa: number;
  wpa: number;
}

export const EXPECTED_ENTITIES = 23;
export const FRAME_HZ = 10;

export interface AlignmentIssue {
  playId: string;
  issue: string;
}

/** Validate an aligned play: entity count, 10 Hz cadence, monotonic time. */
export function validateAlignedPlay(p: AlignedPlay): AlignmentIssue[] {
  const issues: AlignmentIssue[] = [];
  for (const f of p.frames) {
    if (f.entities.length !== EXPECTED_ENTITIES) {
      issues.push({ playId: p.playId, issue: `frame ${f.frameId}: ${f.entities.length} entities, expected ${EXPECTED_ENTITIES}` });
    }
  }
  for (let i = 1; i < p.frames.length; i++) {
    const prev = p.frames[i - 1];
    const cur = p.frames[i];
    if (prev === undefined || cur === undefined) continue;
    const dt = cur.t - prev.t;
    if (Math.abs(dt - 1 / FRAME_HZ) > 1e-6) {
      issues.push({ playId: p.playId, issue: `frame ${cur.frameId}: dt=${dt.toFixed(4)}s, expected 0.1s` });
    }
  }
  if (p.frames.length === 0) issues.push({ playId: p.playId, issue: "no frames" });
  return issues;
}

/** 1-Wasserstein distance between two 1-D samples (yardage distributions). */
export function wasserstein1(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return Infinity;
  const as = [...a].sort((x, y) => x - y);
  const bs = [...b].sort((x, y) => x - y);
  const n = Math.max(as.length, bs.length);
  const qa = (q: number): number => as[Math.min(as.length - 1, Math.floor(q * as.length))] ?? 0;
  const qb = (q: number): number => bs[Math.min(bs.length - 1, Math.floor(q * bs.length))] ?? 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(qa(i / n) - qb(i / n));
  return sum / n;
}

/** Gate: generated yardage W1 distance <= 0.5 vs real. */
export function yardageGatePasses(generated: number[], real: number[]): boolean {
  return wasserstein1(generated, real) <= 0.5;
}

/** Live-data gate: W1 + outcome-calibration on Weeks 13-17. */
export const GSE_NGS_SIM_ENABLED = false;

