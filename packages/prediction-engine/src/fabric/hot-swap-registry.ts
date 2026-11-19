/**
 * SHA-256 content-addressed Champion registry & <5ms hot-swap inference.
 *
 * Self-contained pure-TypeScript SHA-256 + invariant verification ensures bit
 * identical bundle verification across Node, edge WebWorkers, and WebGPU hosts.
 */

import { jointExceedance, type SgpPairing } from "../nfl/sgp-copula";
import {
  verifyFrechetHoeffdingBounds,
  verifyMarkovRowStochastic,
  verifyProperScoringAndConformal,
} from "./invariants";
import { encodeUtf8Bytes } from "./philox";

const nowMs = (): number => {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance;
  return perf && typeof perf.now === "function" ? perf.now() : Date.now();
};

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

export function sha256HexUtf8(text: string): string {
  const bytes = encodeUtf8Bytes(text);
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes, 0);
  padded[bytes.length] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(paddedLen - 8, Math.floor(bitLen / 4294967296), false);
  dv.setUint32(paddedLen - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = dv.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = (rotr(w[i - 15]!, 7) ^ rotr(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3)) >>> 0;
      const s1 = (rotr(w[i - 2]!, 17) ^ rotr(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10)) >>> 0;
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i += 1) {
      const s1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + s1 + ch + SHA256_K[i]! + w[i]!) >>> 0;
      const s0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7].map((x) => x.toString(16).padStart(8, "0")).join("");
}

export interface ChampionBundle {
  readonly versionTag: string;
  readonly islandOrigin: string;
  readonly copulaParams: Readonly<Record<string, number>>;
  readonly markovDriveMatrix: readonly (readonly number[])[];
  readonly sinkhornParams: Readonly<Record<string, number>>;
  readonly conformalOffsets: Readonly<Record<string, number>>;
  readonly corpusPillarWeights: Readonly<Record<string, number>>;
  readonly bundleSha256: string;
}

function sortedNumericRecord(rec: Readonly<Record<string, number>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of Object.keys(rec).sort()) {
    out[key] = Number(rec[key]!);
  }
  return out;
}

export function computeBundleSha256(bundle: Omit<ChampionBundle, "bundleSha256">): string {
  const core = {
    version_tag: bundle.versionTag,
    island_origin: bundle.islandOrigin,
    copula_params: sortedNumericRecord(bundle.copulaParams),
    markov_drive_matrix: bundle.markovDriveMatrix.map((r) => r.map(Number)),
    sinkhorn_params: sortedNumericRecord(bundle.sinkhornParams),
    conformal_offsets: sortedNumericRecord(bundle.conformalOffsets),
    corpus_pillar_weights: sortedNumericRecord(bundle.corpusPillarWeights),
  };
  return sha256HexUtf8(JSON.stringify(core));
}

export function buildChampionBundle(spec: Omit<ChampionBundle, "bundleSha256">): ChampionBundle {
  const copulaParams = sortedNumericRecord(spec.copulaParams);
  const sinkhornParams = sortedNumericRecord(spec.sinkhornParams);
  const conformalOffsets = sortedNumericRecord(spec.conformalOffsets);
  const corpusPillarWeights = sortedNumericRecord(spec.corpusPillarWeights);
  const core = {
    versionTag: spec.versionTag,
    islandOrigin: spec.islandOrigin,
    copulaParams,
    markovDriveMatrix: spec.markovDriveMatrix,
    sinkhornParams,
    conformalOffsets,
    corpusPillarWeights,
  };
  return {
    ...core,
    bundleSha256: computeBundleSha256(core),
  };
}

export function verifyChampionBundle(bundle: ChampionBundle): { readonly ok: boolean; readonly reason: string } {
  if (bundle.bundleSha256 !== computeBundleSha256(bundle)) {
    return { ok: false, reason: "bundle_sha256_mismatch" };
  }
  const mv = verifyMarkovRowStochastic(bundle.markovDriveMatrix, 1e-6);
  if (!mv.ok) return { ok: false, reason: `markov_invariant:${mv.reason}` };

  const eps = bundle.sinkhornParams.sinkhorn_eps ?? 0;
  if (!Number.isFinite(eps) || eps <= 0) {
    return { ok: false, reason: "invalid_sinkhorn_eps" };
  }
  const qLo = bundle.conformalOffsets.q_lo_delta ?? -0.075;
  const qMid = bundle.conformalOffsets.q_mid_delta ?? 0;
  const qHi = bundle.conformalOffsets.q_hi_delta ?? 0.075;
  const cv = verifyProperScoringAndConformal(0, [0.5 + qLo, 0.5 + qMid, 0.5 + qHi]);
  if (!cv.ok) return { ok: false, reason: `conformal_invariant:${cv.reason}` };

  const thetaWr = bundle.copulaParams.theta_qb_wr ?? 0.788;
  const joint = jointExceedance(0.52, 0.48, thetaWr);
  const fv = verifyFrechetHoeffdingBounds([0.52, 0.48], joint);
  if (!fv.ok) return { ok: false, reason: `copula_invariant:${fv.reason}` };

  return { ok: true, reason: "ok" };
}

export function defaultChampionBundle(): ChampionBundle {
  return buildChampionBundle({
    versionTag: "v1.0.0-baseline",
    islandOrigin: "copula_tail",
    copulaParams: {
      theta_qb_wr: 0.788,
      theta_qb_te: 0.57,
      theta_qb_rb: 0.1,
      student_t_nu: 6.0,
    },
    markovDriveMatrix: [
      [0.42, 0.34, 0.16, 0.08],
      [0.18, 0.48, 0.24, 0.1],
      [0.12, 0.26, 0.46, 0.16],
      [0.28, 0.22, 0.18, 0.32],
    ],
    sinkhornParams: { sinkhorn_eps: 0.05, vmls_kkt_lambda: 0.08 },
    conformalOffsets: {
      q_lo_delta: -0.075,
      q_mid_delta: 0,
      q_hi_delta: 0.075,
      min_edge_threshold: 0.02,
    },
    corpusPillarWeights: { rrf_k: 60, foundry_primitive_boost: 0.12 },
  });
}

export interface HotSwapQueryResult {
  readonly jointProb: number;
  readonly conformalLow: number;
  readonly conformalHigh: number;
  readonly decision: "PLAY" | "PASS";
  readonly bundleSha256: string;
  readonly versionTag: string;
  readonly latencyMs: number;
}

export class HotSwapInferenceEngine {
  private active: ChampionBundle;
  private rollbackBundle: ChampionBundle | null = null;
  private recentFailures = 0;
  public readonly maxLatencyMs: number;
  public readonly historyShas: string[] = [];

  constructor(initial?: ChampionBundle, maxLatencyMs = 5.0) {
    this.active = initial ?? defaultChampionBundle();
    this.maxLatencyMs = maxLatencyMs;
    const check = verifyChampionBundle(this.active);
    if (!check.ok) {
      throw new Error(`Initial bundle invalid: ${check.reason}`);
    }
    this.historyShas.push(this.active.bundleSha256);
  }

  public get activeBundle(): ChampionBundle {
    return this.active;
  }

  public hotSwap(candidate: ChampionBundle): { readonly ok: boolean; readonly reason: string } {
    const check = verifyChampionBundle(candidate);
    if (!check.ok) return { ok: false, reason: check.reason };
    this.rollbackBundle = this.active;
    this.active = candidate;
    this.recentFailures = 0;
    this.historyShas.push(candidate.bundleSha256);
    return { ok: true, reason: "swapped" };
  }

  public rollback(): boolean {
    if (!this.rollbackBundle) return false;
    const prev = this.active;
    this.active = this.rollbackBundle;
    this.rollbackBundle = prev;
    this.recentFailures = 0;
    return true;
  }

  public recordHealthSample(ok: boolean, latencyMs: number): boolean {
    if (!ok || latencyMs > this.maxLatencyMs) {
      this.recentFailures += 1;
      if (this.recentFailures >= 3) {
        return this.rollback();
      }
    } else {
      this.recentFailures = 0;
    }
    return false;
  }

  public query(input: {
    p1: number;
    p2: number;
    pairing?: SgpPairing;
    marketFairProb?: number;
  }): HotSwapQueryResult {
    const t0 = nowMs();
    const bundle = this.active;
    const pairing = input.pairing ?? "QB-WR";
    const thetaKey =
      pairing === "QB-WR"
        ? "theta_qb_wr"
        : pairing === "QB-TE"
          ? "theta_qb_te"
          : "theta_qb_rb";
    const theta = bundle.copulaParams[thetaKey] ?? 0.1;
    const joint = jointExceedance(input.p1, input.p2, theta);
    const qLo = bundle.conformalOffsets.q_lo_delta ?? -0.075;
    const qHi = bundle.conformalOffsets.q_hi_delta ?? 0.075;
    const low = Math.max(0, Math.min(1, joint + qLo));
    const high = Math.max(low, Math.min(1, joint + qHi));
    const minEdge = bundle.conformalOffsets.min_edge_threshold ?? 0.02;

    const decision: "PLAY" | "PASS" =
      input.marketFairProb !== undefined && low - input.marketFairProb >= minEdge
        ? "PLAY"
        : "PASS";
    const latencyMs = nowMs() - t0;

    return {
      jointProb: joint,
      conformalLow: low,
      conformalHigh: high,
      decision,
      bundleSha256: bundle.bundleSha256,
      versionTag: bundle.versionTag,
      latencyMs,
    };
  }
}
