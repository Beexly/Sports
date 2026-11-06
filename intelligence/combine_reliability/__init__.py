"""Combine-feature reliability lane.

Feature-level trust for Combine-derived signals: a feature must pass
repeatability, same-yardstick transfer, and controls (gate.py) before it
may make a predictive claim. Same-yardstick normalization (yardstick.py)
is the infrastructure prerequisite. Bend Score and KTD primitives
(features.py) run as SHADOW (weight 0) behind the gate. See README.md.
"""
