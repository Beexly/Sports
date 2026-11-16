"""Bit-exact Philox-4x32-10 counter-based PRNG and WGSL shader generator.

Implements Salmon et al. (2011) Philox-4x32 with 10 rounds using explicit
32-bit unsigned masking (`& 0xFFFFFFFF`) so Python backend workers, TypeScript
CPU/WebWorker nodes, and WebGPU WGSL shaders produce bit-identical uint32
outputs and IEEE-754 exact uniform (0, 1) draws for any `(campaign_seed,
task_id, path_index, step_index, substream)`.
"""

from __future__ import annotations

import math
from collections.abc import Sequence

PHILOX_M0: int = 0xD2511F53
PHILOX_M1: int = 0xCD9E8D57
PHILOX_W0: int = 0x9E3779B9
PHILOX_W1: int = 0xBB67AE85
U32_MASK: int = 0xFFFFFFFF
INV_2_POW_32: float = 1.0 / 4294967296.0


def _mulhilo32(a: int, b: int) -> tuple[int, int]:
    """Return `(lo32, hi32)` of unsigned 32x32 -> 64-bit multiplication."""
    prod = (a & U32_MASK) * (b & U32_MASK)
    return prod & U32_MASK, (prod >> 32) & U32_MASK


def philox4x32_10(
    counter: tuple[int, int, int, int],
    key: tuple[int, int],
) -> tuple[int, int, int, int]:
    """Run 10 rounds of Philox-4x32 PRNG and return 4 unsigned 32-bit words."""
    c0 = counter[0] & U32_MASK
    c1 = counter[1] & U32_MASK
    c2 = counter[2] & U32_MASK
    c3 = counter[3] & U32_MASK
    k0 = key[0] & U32_MASK
    k1 = key[1] & U32_MASK

    for round_idx in range(10):
        lo0, hi0 = _mulhilo32(PHILOX_M0, c0)
        lo1, hi1 = _mulhilo32(PHILOX_M1, c2)
        c0 = (hi1 ^ c1 ^ k0) & U32_MASK
        c1 = lo1
        c2 = (hi0 ^ c3 ^ k1) & U32_MASK
        c3 = lo0
        if round_idx < 9:
            k0 = (k0 + PHILOX_W0) & U32_MASK
            k1 = (k1 + PHILOX_W1) & U32_MASK

    return c0, c1, c2, c3


def fnv1a_32_utf8(text: str) -> int:
    """Compute bit-exact FNV-1a 32-bit hash over UTF-8 bytes of `text`."""
    h = 0x811C9DC5
    for byte in text.encode("utf-8"):
        h = ((h ^ byte) * 0x01000193) & U32_MASK
    return h


def campaign_key_from_seed(campaign_seed: int) -> tuple[int, int]:
    """Split a 64-bit integer seed into a `(k0, k1)` 2x32-bit Philox key."""
    s = int(campaign_seed)
    return s & U32_MASK, (s >> 32) & U32_MASK


def uniform01_from_u32(u: int) -> float:
    """Convert uint32 into exact IEEE-754 float64 in strictly open interval `(0, 1)`."""
    return ((u & U32_MASK) + 0.5) * INV_2_POW_32


def draw_raw_quad(
    campaign_seed: int,
    task_id: str | int,
    path_index: int,
    step_index: int,
    substream: int = 0,
) -> tuple[int, int, int, int]:
    """Draw 4 raw uint32 words keyed purely by simulation coordinate."""
    task_u32 = fnv1a_32_utf8(task_id) if isinstance(task_id, str) else (int(task_id) & U32_MASK)
    counter = (
        task_u32,
        int(path_index) & U32_MASK,
        int(step_index) & U32_MASK,
        int(substream) & U32_MASK,
    )
    return philox4x32_10(counter, campaign_key_from_seed(campaign_seed))


def draw_uniform_quad(
    campaign_seed: int,
    task_id: str | int,
    path_index: int,
    step_index: int,
    substream: int = 0,
) -> tuple[float, float, float, float]:
    """Draw 4 uniform `(0, 1)` floats keyed purely by `(seed, task, path, step, substream)`."""
    w0, w1, w2, w3 = draw_raw_quad(
        campaign_seed=campaign_seed,
        task_id=task_id,
        path_index=path_index,
        step_index=step_index,
        substream=substream,
    )
    return (
        uniform01_from_u32(w0),
        uniform01_from_u32(w1),
        uniform01_from_u32(w2),
        uniform01_from_u32(w3),
    )


def draw_normal_pair_box_muller(
    campaign_seed: int,
    task_id: str | int,
    path_index: int,
    step_index: int,
    substream: int = 0,
) -> tuple[float, float]:
    """Generate two independent standard normal floats via Box-Muller transform."""
    u0, u1, _, _ = draw_uniform_quad(
        campaign_seed=campaign_seed,
        task_id=task_id,
        path_index=path_index,
        step_index=step_index,
        substream=substream,
    )
    radius = math.sqrt(-2.0 * math.log(u0))
    theta = 2.0 * math.pi * u1
    return radius * math.cos(theta), radius * math.sin(theta)


def sample_categorical_markov_step(probs: Sequence[float], u01: float) -> int:
    """Sample a categorical state index given row-stochastic probabilities and `u01`."""
    if not probs:
        raise ValueError("probs sequence must be non-empty")
    u = max(0.0, min(1.0 - 1e-16, float(u01)))
    cdf = 0.0
    for idx, p in enumerate(probs):
        cdf += max(0.0, float(p))
        if u < cdf:
            return idx
    return len(probs) - 1


def generate_philox4x32_wgsl_shader(workgroup_size: int = 64) -> str:
    """Emit a self-contained WebGPU WGSL compute shader matching CPU Philox-4x32-10."""
    wg = max(1, min(256, int(workgroup_size)))
    return f"""// GSE Philox-4x32-10 WebGPU Compute Kernel (bit-exact with Python & TypeScript)
struct SimParams {{
  k0: u32,
  k1: u32,
  task_id_u32: u32,
  step_index: u32,
  n_paths: u32,
}};

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var<storage, read_write> out_words: array<vec4<u32>>;

fn umul32_hi(a: u32, b: u32) -> u32 {{
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
}}

fn philox4x32_10(ctr_in: vec4<u32>, key_in: vec2<u32>) -> vec4<u32> {{
  var c = ctr_in;
  var k = key_in;
  for (var r: u32 = 0u; r < 10u; r = r + 1u) {{
    let lo0 = 0xD2511F53u * c.x;
    let hi0 = umul32_hi(0xD2511F53u, c.x);
    let lo1 = 0xCD9E8D57u * c.z;
    let hi1 = umul32_hi(0xCD9E8D57u, c.z);
    c = vec4<u32>(hi1 ^ c.y ^ k.x, lo1, hi0 ^ c.w ^ k.y, lo0);
    if (r < 9u) {{
      k = vec2<u32>(k.x + 0x9E3779B9u, k.y + 0xBB67AE85u);
    }}
  }}
  return c;
}}

@compute @workgroup_size({wg})
fn rollout_main(@builtin(global_invocation_id) gid: vec3<u32>) {{
  let path_idx = gid.x;
  if (path_idx >= params.n_paths) {{
    return;
  }}
  let ctr = vec4<u32>(params.task_id_u32, path_idx, params.step_index, 0u);
  let key = vec2<u32>(params.k0, params.k1);
  out_words[path_idx] = philox4x32_10(ctr, key);
}}
"""
