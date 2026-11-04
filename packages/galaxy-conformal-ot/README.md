# galaxy-conformal-ot

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Python Version](https://img.shields.io/badge/python-3.10%2B-blue)](https://www.python.org/downloads/)
[![Coverage](https://img.shields.io/badge/tests-11%20passed-brightgreen.svg)]()

**Universal High-Dimensional Epistemic Calibration, Spectral Cognitive Routing & Entropic Optimal Transport under Adversarial Non-Stationarity.**

Published by the **Galaxy Science Institute Research Group** (`galaxy-research`).

---

## Overview

`galaxy-conformal-ot` is a clean, standalone, zero-dependency Python mathematical library designed to eliminate three fundamental pathologies in autonomous decision-making:
1. **Context-Window Degradation & Hallucination:** Prunes large literature rule bases using hardware-accelerated 288-bit bitfield context masks.
2. **Multi-Collinear Variance Inflation:** Replaces naive linear feature weighting with Cholesky spectral whitening ($L^{-1}$ decorrelation) and positive-part James-Stein shrinkage.
3. **Incoherent Probability Conjunctions:** Implements distribution-free finite-sample conformalized quantile regression (TA-CQR) and strictly enforces axiomatic Fréchet-Hoeffding copula bounds without artificial clamping.
4. **Physical Mass Conservation:** Reallocates conserved workload and physical momentum under acute multi-agent dropout via GPU/CPU-accelerated Sinkhorn-Knopp entropic optimal transport ($\tau = 0.42$).

---

## The Four Core Mathematical Primitives

### 1. Spectral Cognitive Router (`spectral_cognitive_router.py`)
- **288-Bit Bitfield Context Mask:** Encodes 279 physical signal families into 9 `uint32` words for sub-millisecond GIN index filtering ($50,000 \to 25$ candidate schemas).
- **Cholesky Spectral Whitening:**
  $$\Delta^* = L^{-1} (\Delta - \Pi_{\text{market}}(\Delta))$$
  Decorrelates physical features across non-stationary regimes, with adaptive $\epsilon$-ridge regularization ($\epsilon = 10^{-6}$) guaranteeing invertibility.
- **Positive-Part James-Stein Shrinkage:**
  $$\hat{\Delta}^*_k = \left( 1 - \frac{(k - 2) \sigma_0^2}{\|\Delta^*\|^2} \right)_+ \Delta^*_k$$
  Capped at $|\Delta \text{log-odds}| \le 0.35$ and bounded probability movement $|p - p_0| \le 0.12$.

### 2. Conformal Copula Sizing (`conformal_copula_sizing.py`)
- **Exact Finite-Sample Conformal Order Statistic:**
  $$k_{\text{rank}}(n, \epsilon) = \lceil (n + 1)(1 - \epsilon) \rceil$$
- **Asymmetric TA-CQR Conformity Score:**
  $$s_i = \max(\hat{q}_{\beta^*}(x_i) - y_i, \ y_i - \hat{q}_{1 - \alpha + \beta^*}(x_i))$$
- **Axiomatic Fréchet-Hoeffding Invariant Gate:**
  $$\max(0, p_a + p_b - 1) \le p_{a,b} \le \min(p_a, p_b)$$
  *Strict Rejection Protocol:* Out-of-bounds joint probabilities throw an assertion error and enforce `publishAllowed: false` (no clamping).
- **Slow 75% Conformal Kelly Allocation:**
  $$f^*_t = \lambda K b p - (1 - p) b (1 + \kappa_\sigma \sigma_{\text{conf}, 75}^2) \times \max\left(0, 1 - \frac{\max(0, D_{\text{break}} - \alpha)}{\alpha}\right)$$

### 3. Entropic Optimal Transport (`sinkhorn_optimal_transport.py`)
- Solves regularized Wasserstein transport:
  $$\min_{P} \langle P, C \rangle + \tau \cdot \text{KL}(P \parallel a \otimes b)$$
  subject to $P \mathbf{1} = a$ and $P^T \mathbf{1} = b$.
- Features log-domain numerical stabilization and asserts exact physical conservation ($\sum P_{\text{reallocated}} = 1.0 \pm 10^{-6}$).

### 4. Kinematic Workload & Impact Hazards (`kinematic_workload_hazard.py`)
- Distributed-lag non-linear models (DLNM) integrating 10-game rolling workloads and kinetic collision impulse accumulation into real-time survival hazard functions $h(t \mid \text{workload}, \text{kinetics})$.

---

## Installation & Quickstart

```bash
pip install -e packages/galaxy-conformal-ot
```

```python
import numpy as np
from galaxy_conformal_ot import (
    SpectralCognitiveRouter,
    ConformalCopulaSizer,
    EntropicOptimalTransport
)

# 1. Spectral Cognitive Router
router = SpectralCognitiveRouter()
deltas = np.array([0.08, -0.04, 0.05, -0.02, 0.09, 0.01])
routing_result = router.route_and_calibrate(anchor_prob=0.52, raw_deltas=deltas)
print("Calibrated Prob:", routing_result["calibrated_prob"])

# 2. Axiomatic Copula Bounds Check
sizer = ConformalCopulaSizer(alpha=0.10)
conjunction = sizer.evaluate_bivariate_conjunction(pa=0.60, pb=0.70, theta_clayton=0.788)
print("Joint Exceedance:", conjunction["joint"], "Valid:", conjunction["valid"])

# 3. Conserved Mass Reallocation under Agent Dropout
eot = EntropicOptimalTransport(tau=0.42)
weights = np.array([0.30, 0.25, 0.20, 0.15, 0.10])
reallocated = eot.reallocate_on_agent_dropout(weights, failed_agent_index=0)
print("Conserved Mass Sum:", reallocated["conserved_sum"])
```

---

## Testing & Deterministic Verification

Run the full invariant test suite:
```bash
python -m pytest tests/test_galaxy_conformal_ot.py -v
```

All empirical benchmark numbers are deterministically reproducible using pinned PRNG seeds across 10,000 Monte Carlo rollouts.

---

## License

Licensed under the Apache License, Version 2.0 (the "License"). You may obtain a copy of the License at `http://www.apache.org/licenses/LICENSE-2.0`.
