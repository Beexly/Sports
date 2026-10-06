# Honest refusal

INVALID, depth L1, offensive_line UNCHECKED, levels empty is a correct outcome when the chain cannot be built. It is not a failed kill. A kill requires a chain. No chain means the adversary never ran.

DataGapError is the correct outcome when the artifact is absent. An empty list, 0.0, 0.5, or a league mean in that spot is a fabricated measurement.

trust/abstention.py is not this policy. It is a synthetic selective-classification backtest (seed 1778, n=2000, labeled synthetic in its header). Do not cite it as the live refusal gate. The live refusal is integration/api.py raising or recording DATA-GAP, and the checklist refusing to publish UNCHECKED at L3+.

A passing test on a hand-built trace does not prove the live path refuses. tests/e2e/test_reasoning_trace_e2e.py::TestT1PressureFunnelRejected is marked adversary for that reason. The live probe is tests/e2e/test_t1_real_e2e.py.
