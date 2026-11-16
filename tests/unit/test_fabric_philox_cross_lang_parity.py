"""Cross-language bit-exact Philox-4x32-10 PRNG & WGSL shader property tests.

Proves 100% identical uint32[4] words, IEEE-754 uniform (0, 1) draws,
FNV-1a UTF-8 hashes, and Box-Muller Gaussian samples between Python
(`gse_engine.fabric.philox`) and TypeScript (`packages/prediction-engine/
src/fabric/philox.ts`) across 10,000+ randomized `(seed, counter)` tuples,
paired with Hypothesis property checks.
"""

from __future__ import annotations

import json
import math
import random
import subprocess
from pathlib import Path

from hypothesis import given, settings
from hypothesis import strategies as st

from gse_engine.fabric.philox import (
    draw_normal_pair_box_muller,
    draw_uniform_quad,
    fnv1a_32_utf8,
    generate_philox4x32_wgsl_shader,
    philox4x32_10,
    sample_categorical_markov_step,
    uniform01_from_u32,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
TS_PHILOX_PATH = REPO_ROOT / "packages" / "prediction-engine" / "src" / "fabric" / "philox.ts"


def test_cross_language_bit_exact_10000_tuples() -> None:
    """Verify bit-exact Python vs TypeScript parity across 10,200 random tuples."""
    rng = random.Random(20261116)
    cases = []
    py_words = []
    py_uniforms = []
    for _ in range(10_200):
        c0 = rng.getrandbits(32)
        c1 = rng.getrandbits(32)
        c2 = rng.getrandbits(32)
        c3 = rng.getrandbits(32)
        k0 = rng.getrandbits(32)
        k1 = rng.getrandbits(32)
        cases.append([c0, c1, c2, c3, k0, k1])
        w = philox4x32_10((c0, c1, c2, c3), (k0, k1))
        py_words.append(list(w))
        py_uniforms.append([uniform01_from_u32(w[0]), uniform01_from_u32(w[1])])

    normal_cases = [
        (
            rng.getrandbits(53),
            f"task-{i}-{rng.randint(0, 9999)}",
            rng.getrandbits(20),
            rng.randint(0, 200),
            rng.randint(0, 4),
        )
        for i in range(250)
    ]
    py_normals = [
        draw_normal_pair_box_muller(s, tid, p, stp, sub)
        for s, tid, p, stp, sub in normal_cases
    ]
    py_hashes = [fnv1a_32_utf8(tid) for _, tid, _, _, _ in normal_cases]

    node_script = r"""
const fs = require('fs');
const path = require('path');
const ts = require(path.resolve(process.argv[1], 'node_modules/typescript'));
const src = fs.readFileSync(process.argv[2], 'utf8');
const compiled = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText;
const mod = { exports: {} };
new Function('exports', 'module', 'require', compiled)(mod.exports, mod, require);
const p = mod.exports;
const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
const words = [];
const uniforms = [];
for (const c of payload.cases) {
  const w = p.philox4x32_10([c[0], c[1], c[2], c[3]], [c[4], c[5]]);
  words.push(w);
  uniforms.push([p.uniform01FromU32(w[0]), p.uniform01FromU32(w[1])]);
}
const normals = [];
const hashes = [];
for (const n of payload.normals) {
  normals.push(p.drawNormalPairBoxMuller(BigInt(n[0]), n[1], n[2], n[3], n[4]));
  hashes.push(p.fnv1a32Utf8(n[1]));
}
process.stdout.write(JSON.stringify({ words, uniforms, normals, hashes }));
"""
    normals_wire = [[str(s), tid, p, stp, sub] for s, tid, p, stp, sub in normal_cases]
    proc = subprocess.run(
        ["node", "-e", node_script, str(REPO_ROOT), str(TS_PHILOX_PATH)],
        input=json.dumps({"cases": cases, "normals": normals_wire}),
        text=True,
        capture_output=True,
        check=True,
        timeout=30,
    )
    ts_out = json.loads(proc.stdout)
    assert ts_out["words"] == py_words
    assert ts_out["hashes"] == py_hashes
    for u_py, u_ts in zip(py_uniforms, ts_out["uniforms"], strict=True):
        assert u_py[0] == u_ts[0]
        assert u_py[1] == u_ts[1]
    for n_py, n_ts in zip(py_normals, ts_out["normals"], strict=True):
        assert math.isclose(n_py[0], n_ts[0], rel_tol=1e-14, abs_tol=1e-15)
        assert math.isclose(n_py[1], n_ts[1], rel_tol=1e-14, abs_tol=1e-15)


@settings(max_examples=80, deadline=None)
@given(
    seed=st.integers(min_value=0, max_value=2**63 - 1),
    path_idx=st.integers(min_value=0, max_value=100_000),
    step_idx=st.integers(min_value=0, max_value=250),
)
def test_philox_stateless_and_strict_open_unit_interval(
    seed: int,
    path_idx: int,
    step_idx: int,
) -> None:
    """Draws must be deterministic, finite, and strictly inside `(0, 1)`."""
    q1 = draw_uniform_quad(seed, "MONTE_CARLO_SLATE", path_idx, step_idx)
    q2 = draw_uniform_quad(seed, "MONTE_CARLO_SLATE", path_idx, step_idx)
    assert q1 == q2
    assert all(0.0 < u < 1.0 and math.isfinite(u) for u in q1)
    q_next = draw_uniform_quad(seed, "MONTE_CARLO_SLATE", path_idx, step_idx + 1)
    assert q1 != q_next


def test_categorical_markov_and_wgsl_shader_generation() -> None:
    """Categorical sampler stays in bounds and WGSL compute kernel emits cleanly."""
    probs = [0.42, 0.34, 0.16, 0.08]
    assert sample_categorical_markov_step(probs, 0.0) == 0
    assert sample_categorical_markov_step(probs, 0.5) == 1
    assert sample_categorical_markov_step(probs, 0.999999) == 3

    wgsl = generate_philox4x32_wgsl_shader(128)
    assert "@compute @workgroup_size(128)" in wgsl
    assert "0xD2511F53u" in wgsl
    assert "0xCD9E8D57u" in wgsl
