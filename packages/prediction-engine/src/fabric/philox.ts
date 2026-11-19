/**
 * Bit-exact Philox-4x32-10 counter-based PRNG and WGSL compute generator.
 *
 * Uses Math.imul and `>>> 0` 32-bit unsigned arithmetic with 16-bit limb
 * splitting for `umul32Hi` so outputs match Python backend workers bit-for-bit
 * with zero IEEE-754 mantissa precision drift.
 */

export const PHILOX_M0 = 0xd2511f53;
export const PHILOX_M1 = 0xcd9e8d57;
export const PHILOX_W0 = 0x9e3779b9;
export const PHILOX_W1 = 0xbb67ae85;
export const INV_2_POW_32 = 1.0 / 4294967296.0;

export type PhiloxCounter = readonly [number, number, number, number];
export type PhiloxKey = readonly [number, number];
export type PhiloxWords = readonly [number, number, number, number];
export type FloatQuad = readonly [number, number, number, number];

export function umul32Lo(a: number, b: number): number {
  return Math.imul(a >>> 0, b >>> 0) >>> 0;
}

export function umul32Hi(a: number, b: number): number {
  const ua = a >>> 0;
  const ub = b >>> 0;
  const aLo = ua & 0xffff;
  const aHi = ua >>> 16;
  const bLo = ub & 0xffff;
  const bHi = ub >>> 16;

  const p0 = Math.imul(aLo, bLo) >>> 0;
  const p1 = Math.imul(aLo, bHi) >>> 0;
  const p2 = Math.imul(aHi, bLo) >>> 0;
  const p3 = Math.imul(aHi, bHi) >>> 0;

  const mid = ((p0 >>> 16) + (p1 & 0xffff) + (p2 & 0xffff)) >>> 0;
  return (p3 + (p1 >>> 16) + (p2 >>> 16) + (mid >>> 16)) >>> 0;
}

export function philox4x32_10(counter: PhiloxCounter, key: PhiloxKey): PhiloxWords {
  let c0 = counter[0] >>> 0;
  let c1 = counter[1] >>> 0;
  let c2 = counter[2] >>> 0;
  let c3 = counter[3] >>> 0;
  let k0 = key[0] >>> 0;
  let k1 = key[1] >>> 0;

  for (let roundIdx = 0; roundIdx < 10; roundIdx += 1) {
    const lo0 = umul32Lo(PHILOX_M0, c0);
    const hi0 = umul32Hi(PHILOX_M0, c0);
    const lo1 = umul32Lo(PHILOX_M1, c2);
    const hi1 = umul32Hi(PHILOX_M1, c2);

    const n0 = (hi1 ^ c1 ^ k0) >>> 0;
    const n1 = lo1;
    const n2 = (hi0 ^ c3 ^ k1) >>> 0;
    const n3 = lo0;

    c0 = n0;
    c1 = n1;
    c2 = n2;
    c3 = n3;

    if (roundIdx < 9) {
      k0 = (k0 + PHILOX_W0) >>> 0;
      k1 = (k1 + PHILOX_W1) >>> 0;
    }
  }

  return [c0, c1, c2, c3];
}

export function encodeUtf8Bytes(text: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    let cp = text.charCodeAt(i);
    if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        cp = 0x10000 + ((cp - 0xd800) << 10) + (next - 0xdc00);
        i += 1;
      }
    }
    if (cp < 0x80) {
      out.push(cp);
    } else if (cp < 0x800) {
      out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    }
  }
  return Uint8Array.from(out);
}

export function fnv1a32Utf8(text: string): number {
  const bytes = encodeUtf8Bytes(text);
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i += 1) {
    h = Math.imul((h ^ bytes[i]!) >>> 0, 0x01000193) >>> 0;
  }
  return h;
}

export function campaignKeyFromSeed(campaignSeed: number | bigint): PhiloxKey {
  if (typeof campaignSeed === "bigint") {
    const mask = 0xffffffffn;
    return [Number(campaignSeed & mask), Number((campaignSeed >> 32n) & mask)];
  }
  const big = BigInt(Math.trunc(campaignSeed));
  const mask = 0xffffffffn;
  return [Number(big & mask), Number((big >> 32n) & mask)];
}

export function uniform01FromU32(u: number): number {
  return ((u >>> 0) + 0.5) * INV_2_POW_32;
}

export function drawRawQuad(
  campaignSeed: number | bigint,
  taskId: string | number,
  pathIndex: number,
  stepIndex: number,
  substream = 0,
): PhiloxWords {
  const taskU32 = typeof taskId === "string" ? fnv1a32Utf8(taskId) : taskId >>> 0;
  return philox4x32_10(
    [taskU32, pathIndex >>> 0, stepIndex >>> 0, substream >>> 0],
    campaignKeyFromSeed(campaignSeed),
  );
}

export function drawUniformQuad(
  campaignSeed: number | bigint,
  taskId: string | number,
  pathIndex: number,
  stepIndex: number,
  substream = 0,
): FloatQuad {
  const [w0, w1, w2, w3] = drawRawQuad(campaignSeed, taskId, pathIndex, stepIndex, substream);
  return [
    uniform01FromU32(w0),
    uniform01FromU32(w1),
    uniform01FromU32(w2),
    uniform01FromU32(w3),
  ];
}

export function drawNormalPairBoxMuller(
  campaignSeed: number | bigint,
  taskId: string | number,
  pathIndex: number,
  stepIndex: number,
  substream = 0,
): readonly [number, number] {
  const [u0, u1] = drawUniformQuad(campaignSeed, taskId, pathIndex, stepIndex, substream);
  const radius = Math.sqrt(-2.0 * Math.log(u0));
  const theta = 2.0 * Math.PI * u1;
  return [radius * Math.cos(theta), radius * Math.sin(theta)];
}

export function sampleCategoricalMarkovStep(probs: readonly number[], u01: number): number {
  if (probs.length === 0) {
    throw new Error("probs sequence must be non-empty");
  }
  const u = Math.max(0, Math.min(1 - 1e-16, u01));
  let cdf = 0;
  for (let i = 0; i < probs.length; i += 1) {
    cdf += Math.max(0, probs[i]!);
    if (u < cdf) return i;
  }
  return probs.length - 1;
}

const SOBOL_POLY_TABLE: readonly (readonly [number, number, readonly number[]])[] = [
  [1, 0, [1]],
  [2, 1, [1, 3]],
  [3, 1, [1, 3, 1]],
  [3, 2, [1, 1, 1]],
  [4, 1, [1, 1, 3, 3]],
  [4, 4, [1, 3, 5, 13]],
  [5, 2, [1, 1, 5, 5, 17]],
  [5, 4, [1, 1, 5, 5, 5]],
  [5, 7, [1, 1, 7, 11, 19]],
  [5, 11, [1, 1, 5, 1, 1]],
  [5, 13, [1, 1, 1, 3, 11]],
  [5, 14, [1, 3, 5, 5, 31]],
  [6, 1, [1, 3, 3, 9, 7, 49]],
  [6, 13, [1, 1, 1, 15, 21, 21]],
  [6, 16, [1, 3, 1, 13, 27, 49]],
];

export function reverseBits32(x: number): number {
  let u = x >>> 0;
  u = (((u >>> 1) & 0x55555555) | ((u & 0x55555555) << 1)) >>> 0;
  u = (((u >>> 2) & 0x33333333) | ((u & 0x33333333) << 2)) >>> 0;
  u = (((u >>> 4) & 0x0f0f0f0f) | ((u & 0x0f0f0f0f) << 4)) >>> 0;
  u = (((u >>> 8) & 0x00ff00ff) | ((u & 0x00ff00ff) << 8)) >>> 0;
  return (((u >>> 16) | (u << 16)) >>> 0);
}

export function burleyOwenScrambleU32(val: number, seedU32: number): number {
  let x = reverseBits32(val);
  x = (x + (seedU32 >>> 0)) >>> 0;
  x = (x ^ Math.imul(x, 0x6c50b47c)) >>> 0;
  x = (x ^ Math.imul(x, 0xb82f1e52)) >>> 0;
  x = (x ^ Math.imul(x, 0xc7afe638)) >>> 0;
  x = (x ^ Math.imul(x, 0x8d22f6e6)) >>> 0;
  return reverseBits32(x);
}

function buildSobolDirections(dim: number): number[][] {
  const nDims = Math.max(1, Math.min(16, Math.trunc(dim)));
  const dirs: number[][] = [];
  const v0: number[] = [];
  for (let b = 0; b < 32; b += 1) {
    v0.push((1 << (31 - b)) >>> 0);
  }
  dirs.push(v0);

  for (let d = 1; d < nDims; d += 1) {
    const [s, a, mInit] = SOBOL_POLY_TABLE[d - 1]!;
    const v = new Array<number>(32).fill(0);
    for (let b = 0; b < s; b += 1) {
      v[b] = (mInit[b]! << (31 - b)) >>> 0;
    }
    for (let b = s; b < 32; b += 1) {
      let val = (v[b - s]! ^ (v[b - s]! >>> s)) >>> 0;
      for (let k = 1; k < s; k += 1) {
        if ((a >>> (s - 1 - k)) & 1) {
          val = (val ^ v[b - k]!) >>> 0;
        }
      }
      v[b] = val >>> 0;
    }
    dirs.push(v);
  }
  return dirs;
}

export function owenScrambledSobolRawU32(
  numPaths: number,
  dim: number,
  campaignSeed: number | bigint,
  taskId: string | number,
): number[][] {
  const nP = Math.max(1, Math.trunc(numPaths));
  const nD = Math.max(1, Math.min(16, Math.trunc(dim)));
  const dirs = buildSobolDirections(nD);
  const dimSeeds: number[] = [];
  for (let dIdx = 0; dIdx < nD; dIdx += 1) {
    const [w0] = drawRawQuad(campaignSeed, taskId, 0x50b01000 + dIdx, 0, 7);
    dimSeeds.push(w0 >>> 0);
  }

  const out: number[][] = [];
  for (let i = 0; i < nP; i += 1) {
    const g = (i ^ (i >>> 1)) >>> 0;
    const row: number[] = [];
    for (let d = 0; d < nD; d += 1) {
      let rawV = 0;
      const vCol = dirs[d]!;
      let tmp = g;
      let b = 0;
      while (tmp !== 0) {
        if (tmp & 1) {
          rawV = (rawV ^ vCol[b]!) >>> 0;
        }
        tmp >>>= 1;
        b += 1;
      }
      row.push(burleyOwenScrambleU32(rawV, dimSeeds[d]!));
    }
    out.push(row);
  }
  return out;
}

export function owenScrambledSobolMatrix(
  numPaths: number,
  dim: number,
  campaignSeed: number | bigint,
  taskId: string | number,
): number[][] {
  return owenScrambledSobolRawU32(numPaths, dim, campaignSeed, taskId).map((row) =>
    row.map((w) => uniform01FromU32(w)),
  );
}

export function generatePhilox4x32WgslShader(workgroupSize = 64): string {
  const wg = Math.max(1, Math.min(256, Math.trunc(workgroupSize)));
  return `// GSE Philox-4x32-10 WebGPU Compute Kernel (bit-exact with Python & TypeScript)
struct SimParams {
  k0: u32,
  k1: u32,
  task_id_u32: u32,
  step_index: u32,
  n_paths: u32,
};

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var<storage, read_write> out_words: array<vec4<u32>>;

fn umul32_hi(a: u32, b: u32) -> u32 {
  let a_lo = a & 0xffffu;
  let a_hi = a >> 16u;
  let b_lo = b & 0xffffu;
  let b_hi = b >> 16u;
  let p0 = a_lo * b_lo;
  let p1 = a_lo * b_hi;
  let p2 = a_hi * b_lo;
  let p3 = a_hi * b_hi;
  let mid = (p0 >> 16u) + (p1 & 0xffffu) + (p2 & 0xffffu);
  return p3 + (p1 >> 16u) + (p2 >> 16u) + (mid >> 16u);
}

fn philox4x32_10(ctr_in: vec4<u32>, key_in: vec2<u32>) -> vec4<u32> {
  var c = ctr_in;
  var k = key_in;
  for (var r: u32 = 0u; r < 10u; r = r + 1u) {
    let lo0 = 0xD2511F53u * c.x;
    let hi0 = umul32_hi(0xD2511F53u, c.x);
    let lo1 = 0xCD9E8D57u * c.z;
    let hi1 = umul32_hi(0xCD9E8D57u, c.z);
    c = vec4<u32>(hi1 ^ c.y ^ k.x, lo1, hi0 ^ c.w ^ k.y, lo0);
    if (r < 9u) {
      k = vec2<u32>(k.x + 0x9E3779B9u, k.y + 0xBB67AE85u);
    }
  }
  return c;
}

@compute @workgroup_size(${wg})
fn rollout_main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let path_idx = gid.x;
  if (path_idx >= params.n_paths) {
    return;
  }
  let ctr = vec4<u32>(params.task_id_u32, path_idx, params.step_index, 0u);
  let key = vec2<u32>(params.k0, params.k1);
  out_words[path_idx] = philox4x32_10(ctr, key);
}
`;
}
