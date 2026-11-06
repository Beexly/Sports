"""
Apply-repair + re-measure loop.

Rules:
  1. Statistical ops (realign, drop_edge) may auto-apply in a loop.
  2. Structural ops (relax_restriction) may auto-apply; grow_structure is propose-only.
  3. Relative-fraud / ledger write-back NEVER auto-applies without policy_key.
  4. Every apply returns before/after consistency so the caller can stop on plateau.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from typing import Any
import numpy as np

from crc import EdgeMap, crc_connection, CRCReport, rotation


@dataclass
class GraphState:
    nodes: list[str]
    maps: list[EdgeMap]
    feats: dict[str, np.ndarray]
    reference: dict[str, np.ndarray] | None = None

    def clone(self) -> "GraphState":
        return GraphState(
            nodes=list(self.nodes),
            maps=[EdgeMap(m.source, m.target, m.relation, m.theta) for m in self.maps],
            feats={k: v.copy() for k, v in self.feats.items()},
            reference={k: v.copy() for k, v in self.reference.items()} if self.reference else None,
        )


def measure(state: GraphState) -> CRCReport:
    return crc_connection(state.nodes, state.maps, state.feats, reference=state.reference)


def apply_realign(state: GraphState, source: str, target: str) -> GraphState:
    """Set both endpoints to the mean of their features (statistical realign)."""
    s = state.clone()
    if source in s.feats and target in s.feats:
        mean = 0.5 * (s.feats[source] + s.feats[target])
        s.feats[source] = mean.copy()
        s.feats[target] = mean.copy()
    return s


def apply_drop_edge(state: GraphState, source: str, target: str) -> GraphState:
    s = state.clone()
    s.maps = [m for m in s.maps if not (m.source == source and m.target == target)]
    return s


def apply_relax(state: GraphState, source: str, target: str) -> GraphState:
    """Set theta=0 on the edge (structural relax)."""
    s = state.clone()
    new_maps = []
    for m in s.maps:
        if m.source == source and m.target == target:
            new_maps.append(EdgeMap(m.source, m.target, m.relation, 0.0))
        else:
            new_maps.append(m)
    s.maps = new_maps
    return s


def repair_step(state: GraphState, proposal: dict[str, Any]) -> tuple[GraphState, CRCReport, CRCReport]:
    before = measure(state)
    action = proposal.get("action")
    src, tgt = proposal.get("source"), proposal.get("target")
    if action == "realign":
        after_state = apply_realign(state, src, tgt)
    elif action == "drop_edge":
        after_state = apply_drop_edge(state, src, tgt)
    elif action == "relax_restriction":
        after_state = apply_relax(state, src, tgt)
    else:
        after_state = state.clone()
    after = measure(after_state)
    return after_state, before, after


def auto_loop(
    state: GraphState,
    *,
    max_steps: int = 5,
    allow_structural: bool = True,
) -> dict[str, Any]:
    history = []
    cur = state.clone()
    for step in range(max_steps):
        report = measure(cur)
        if report.repair_class == "consistent" and report.energy < 1e-8:
            break
        props = [p for p in report.proposals if p["action"] != "grow_structure"]
        if not allow_structural:
            props = [p for p in props if p["action"] != "relax_restriction"]
        if not props:
            break
        # Never auto write-back relative fraud
        if report.relative.get("status") == "self_consistent_wrong_vs_ledger":
            history.append({"step": step, "stopped": "relative_fraud_requires_policy"})
            break
        cur, before, after = repair_step(cur, props[0])
        history.append({
            "step": step,
            "action": props[0]["action"],
            "before_energy": before.energy,
            "after_energy": after.energy,
            "after_class": after.repair_class,
        })
        if after.energy >= before.energy - 1e-12:
            break
    final = measure(cur)
    return {"history": history, "final": final.to_dict()}
