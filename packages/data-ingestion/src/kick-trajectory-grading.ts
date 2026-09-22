/**
 * Applying Deep Learning to Basketball Trajectories
 *
 * arXiv:1608.03793v2 · lane:tracking · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Replicate the paper's deep-learning sequential trajectory classification for NFL kick grading:
 * NGS ball-tracking frames (10 Hz) for all field-goal attempts and punts 2022-2025 joined to
 * nflverse make/miss labels, sequences of (x, y, z, game clock) from snap/hold to 0.5 s before
 * kick apex, 2-layer LSTM (64 units, dropout 0.6, Adam 0.005) vs tuned GBM on static last-frame
 * features -- serving batch post-game kick-quality / expected-make grading and later real-time
 * live win-probability input.
 *
 * ACCEPTANCE GATE: ADOPT the LSTM trajectory model for GSE kick-quality grading IF it beats the tuned GBM baseline
 * by >=0.03 AUC on the 2024 holdout season AND beats the distance-only model by >=0.05 AUC.
 *
 * Ingest role: parser + feature builder (NGS ball-tracking sequences -> kick-quality features).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1608.03793v2" as const;
export const LANE = "tracking" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the LSTM trajectory model for GSE kick-quality grading IF it beats the tuned GBM baseline
 * by >=0.03 AUC on the 2024 holdout season AND beats the distance-only model by >=0.05 AUC.`;

export const CONFIG = {
  enabled: false,
  lstmSpec: { layers: 2, units: 64, dropout: 0.6, optimizer: "Adam", lr: 0.005, hz: 10 },
  aucGateVsGbm: 0.03,
  aucGateVsDistance: 0.05,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface TrackingFrame {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly gameClock: number;
}

export function isTrackingFrame(x: unknown): x is TrackingFrame {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return isFiniteNumber(o["x"]) && isFiniteNumber(o["y"]) && isFiniteNumber(o["z"]) && isFiniteNumber(o["gameClock"]);
}

/** Validate a raw frame sequence (snap/hold -> 0.5s before apex). Null on malformed. */
export function validateFrames(frames: readonly unknown[]): TrackingFrame[] | null {
  if (frames.length === 0) return null;
  const out: TrackingFrame[] = [];
  for (const f of frames) {
    if (!isTrackingFrame(f)) return null;
    out.push(f);
  }
  return out;
}

/** Static last-frame features (the GBM baseline's input). */
export function lastFrameFeatures(frames: readonly TrackingFrame[]): { x: number; y: number; z: number; apexZ: number } | null {
  if (frames.length === 0) return null;
  const last = frames[frames.length - 1];
  if (!last) return null;
  let apexZ = -Infinity;
  for (const f of frames) if (f.z > apexZ) apexZ = f.z;
  return { x: last.x, y: last.y, z: last.z, apexZ };
}

/** Sequence-level features for the trajectory classifier input spec. */
export function trajectoryFeatures(frames: readonly TrackingFrame[]): {
  n: number;
  durationS: number;
  meanSpeed: number;
  maxZ: number;
  zGain: number;
} | null {
  if (frames.length < 2) return null;
  const first = frames[0]!;
  const last = frames[frames.length - 1]!;
  const durationS = first.gameClock - last.gameClock;
  if (!(durationS > 0)) return null;
  let dist = 0;
  let maxZ = -Infinity;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1]!;
    const b = frames[i]!;
    dist += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    if (b.z > maxZ) maxZ = b.z;
  }
  if (first.z > maxZ) maxZ = first.z;
  return { n: frames.length, durationS, meanSpeed: dist / durationS, maxZ, zGain: maxZ - first.z };
}

/** Slice the sequence to [snap, 0.5s before apex] per the paper's protocol. */
export function sliceToApex(frames: readonly TrackingFrame[], apexLeadS = 0.5): TrackingFrame[] {
  if (frames.length === 0) return [];
  let apexIdx = 0;
  for (let i = 0; i < frames.length; i++) {
    if ((frames[i]?.z ?? -Infinity) > (frames[apexIdx]?.z ?? -Infinity)) apexIdx = i;
  }
  const apexClock = frames[apexIdx]?.gameClock ?? 0;
  return frames.filter((f) => f.gameClock >= apexClock && f.gameClock <= apexClock + apexLeadS);
}
