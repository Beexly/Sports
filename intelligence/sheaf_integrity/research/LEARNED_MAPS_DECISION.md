# Learned restriction maps — decision

## What it would be
Replace fixed SO(2) angles θ_e with maps learned from data (or full product-manifold stalks with learnable curvatures) so restriction structure adapts to observed multi-source patterns.

## Decision: PARK Phase 2

Do not build now.

### Why
1. **No paying training distribution** — learning maps without a labeled repair dataset or accepted SoT risks fitting noise or fraud.
2. **Product value is the decision layer first** — CRC classes + gated repair already ship; learned geometry is optimization, not the wedge.
3. **Safety** — unsupervised fit can absorb `self_consistent_wrong_vs_ledger` into "normal" geometry and hide relative fraud.

### Un-park gates (all required)
1. Explicit founder YES
2. SoT always held out during any fit
3. Supervise only on ops-accepted statistical edges — never relative-fraud clusters
4. Calibration check on held-out fixtures

Until then: refuse to implement learned maps in this folder.
