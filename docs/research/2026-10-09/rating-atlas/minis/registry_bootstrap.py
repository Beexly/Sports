#!/usr/bin/env python3
"""
registry_bootstrap.py — the standing diagnostic/context queue, DECLARED IN CODE.
Nothing here reaches the margin head until HonestyGate PROMOTED + CLV check.
This file IS the queue state (rule 19: the gate is code, not a process).
"""
import json, sys
sys.path.insert(0, "/var/minis/workspace")
from doctrine import HonestyGate, KillLedger, FeatureRegistry

# the frozen CFB walk-forward manifest (wk-6 2026 folds — same family as the gates)
import sys as _s; _s.path.insert(0, "/var/minis/workspace/cfb")
from cfb_ppa_model import load_games, load_closes
SIG = 15.15

games = load_games(); spine = load_closes(games)
folds = []
for gid, g in games.items():
    if g["season"] == 2026 and g["week"] == 6 and gid in spine:
        folds.append({"fold_id": str(gid), "decision_t": 0, "outcome": 0.0,
                      "close_mu": spine[gid], "close_sigma": SIG})
gate = HonestyGate(folds, "cfb_gate_2026_w6_registry")
kl = KillLedger("/var/minis/workspace/cfb/kill_ledger.jsonl")
reg = FeatureRegistry(gate, kl)

DECLARATIONS = [
    # (name, role, rule, promotion condition — pre-written, enforced by promote())
    ("cfb_blowout_mu_shift", "diagnostic", "rule 12/8",
     "31+ favorites beat close +2.84 (n=198)/+3.08 (n=86 median spine); sigma invariant. "
     "PROMOTE only: conditional mu-shift model beats Gaussian-close CRPS on frozen walk-forward + CLV check"),
    ("cfb_travel_gt_1000mi", "context", "rule 8",
     "+1.20 pts, t=1.92, n=581. Context ONLY. "
     "PROMOTE only: travel x altitude interaction measured, then walk-forward + CLV"),
    ("cfb_ppa_precomputed", "diagnostic", "rule 19",
     "CFBD /ppa teams+games; close-anchored pooled win -0.0432 (t=1.83); frozen-manifest loss by 0.026. "
     "PROMOTE only: pooled t>=1.96 on locked folds (cold-start overlay variant wks1-3 first)"),
    ("cfb_closing_total_bias_regime", "context", "rule 8",
     "wk-by-wk -1.05..+3.20 (regime, not constant). Context only; EWMA tracker candidate. "
     "PROMOTE only: bias-decay feature beats close on frozen folds + CLV"),
    ("book_hold_diagnostics", "context", "rule 6",
     "DK 4.19% engineered hold, Caesars/WH sharpest (CRPS 8.335). CalibrationLedger WEIGHTS ONLY. "
     "Volume weighting remains refused; pools require recorded calibration history"),
    ("cfb_altitude_home", "diagnostic", "rule 8",
     "+2.11, t=1.88, n=190. PROMOTE only: with travel interaction, walk-forward + CLV"),
    ("cfb_key_number_ladder", "diagnostic", "rule 12",
     "|3|+|7| = 18.6% of games; empirical residual Gaussian to <0.6% pooled. "
     "PROMOTE only: alt-line prices from empirical class distributions beat book ladders out-of-sample"),
    ("cfb_pbp_tendencies", "diagnostic", "rule 12/13",
     "aggression z, tempo, penalty rates, halftime adjustment (126,362 plays). All diagnostic. "
     "PROMOTE only: residual-vs-close framing + t>=1.96 + walk-forward"),
    ("adp_panel", "diagnostic", "rule 10",
     "cross-source z-deviations feed rankings_diagnostic ONLY (ADPGuard enforces in code)"),
]

for name, role, rule, cond in DECLARATIONS:
    reg.declare(name, role, rule)
    print(f"  declared {name:<32} role={role:<11} ({rule})")

state = {
    "frozen": True,
    "gate_id": gate.gate_id,
    "manifest_sha": gate.manifest_sha,
    "features": {n: {"role": reg.role(n), "condition": c, "rule": r}
                 for n, r, c in [(d[0], d[1], d[3]) for d in DECLARATIONS]},
    "margin_head_inputs": reg.margin_head_inputs(),
    "kill_ledger_entries": len(kl._entries),
    "chain_intact": kl.verify_chain(),
}
json.dump(state, open("/var/minis/workspace/cfb/registry_state.json", "w"), indent=1)
print(f"\n[STATE] margin_head_inputs() = {state['margin_head_inputs']}  <- empty is CORRECT")
print(f"[STATE] manifest sha {gate.manifest_sha[:12]} | kill ledger {state['kill_ledger_entries']} entries | chain {state['chain_intact']}")
print("[RULE] every promotion goes through reg.promote(name, verdict) — no other path exists.")
