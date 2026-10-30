#!/usr/bin/env python3
"""Unit test for Brenier 1/3-Holder stability check around Sinkhorn target/carry reallocation."""
import math
import sys
import unittest
from pathlib import Path
import numpy as np

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from scripts.ops.gse_coach_mind_simulator import (
    DEFAULT_SEALED_BASELINE,
    brenier_one_third_stability_ratio,
    conserve_target_shares_kkt,
    sinkhorn_reallocate_weights,
)


class TestBrenierOneThirdStability(unittest.TestCase):
    def test_synthetic_perturbation_and_sinkhorn_reallocation(self):
        cost_c = DEFAULT_SEALED_BASELINE["costMatrixC"]
        mu = np.array([0.26, 0.21, 0.17, 0.20, 0.16], dtype=np.float64)

        # 1. Small synthetic perturbation: move 7% target share from WR1 to WR2
        nu_small = np.array([0.19, 0.28, 0.17, 0.20, 0.16], dtype=np.float64)
        # Run Sinkhorn reallocation from mu toward nu_small under cost_c
        K = np.exp(-np.asarray(cost_c, dtype=np.float64) / 0.10)
        u = np.ones_like(mu)
        v = np.ones_like(nu_small)
        for _ in range(200):
            u = mu / np.maximum(K @ v, 1e-12)
            v = nu_small / np.maximum(K.T @ u, 1e-12)
        P = np.diag(u) @ K @ np.diag(v)
        realized_small = conserve_target_shares_kkt(P.sum(axis=0))
        ratio_small = brenier_one_third_stability_ratio(mu, nu_small, realized_small)

        # 2. Full WR2 scratch perturbation via sinkhorn_reallocate_weights
        nu_scratch = mu.copy()
        nu_scratch[1] = 0.01
        nu_scratch = nu_scratch / np.sum(nu_scratch)
        realized_scratch_raw, _ = sinkhorn_reallocate_weights(cost_c, mu, ["WR2"])
        realized_scratch = conserve_target_shares_kkt(realized_scratch_raw)
        ratio_scratch = brenier_one_third_stability_ratio(mu, nu_scratch, realized_scratch)

        print(
            f"[BRENIER 1/3 CHECK] 7% synthetic shift ratio = {ratio_small:.4f} | "
            f"WR2 scratch ratio = {ratio_scratch:.4f}"
        )
        self.assertTrue(math.isfinite(ratio_small) and ratio_small > 0.0)
        self.assertTrue(math.isfinite(ratio_scratch) and ratio_scratch > 0.0)
        self.assertLess(ratio_small, 2.0)
        self.assertLess(ratio_scratch, 2.0)


if __name__ == "__main__":
    unittest.main()
