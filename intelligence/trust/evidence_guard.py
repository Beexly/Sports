# Provenance: implements buildable-systems.md SYS-22 (evidence-guard publish gate),
# from predictions/research/2026-09-22/RESCUE.md:6,10,23,46 and syntheses.md S2.
#
# Rules (exact): 15-test evidence guard, 15/15 required for SHIP (RESCUE:6,10);
# every artifact rebinds evidence by hash at publish (RESCUE:23,46); BLOCKED
# artifacts' numbers never touch a live pick -- precedent A8 (Boltzmann 0.2558 vs
# isotonic 0.2148, delta=0.041: the concrete cost of shipping uncalibrated logits).
#
# [INFERENCE] markings below flag mechanics the briefs did not fully specify and I
# chose: the HOLD vs BLOCKED split (brief names BLOCKED; the regression test demands
# a known-BLOCKED artifact confirm HOLD at publish, so publish() maps any
# non-SHIP verdict to HOLD while evaluate() keeps the BLOCKED label and the
# quarantine), the exact 15th-check roster, and the 0.03 hard-block delta.
#
# DATA BASIS: pure logic module -- no data. The A8 precedent numbers are the
# research's own.

import hashlib
import json

N_CHECKS = 15
HARD_BLOCK_BRIER_DELTA = 0.03  # [INFERENCE] hard-block at/above this vs baseline
WILSON_FLOOR = 0.524           # ENGINEERING_PRINCIPLES:24 (see proofledger.py)

_blocked_registry = set()


def _evidence_hash(evidence):
    blob = json.dumps(evidence, sort_keys=True, default=str).encode()
    return hashlib.sha256(blob).hexdigest()


def _check(name, hard, fn):
    return {"name": name, "hard": hard, "fn": fn}


def _checks():
    g = lambda a: a.get("evidence", {}) or {}
    return [
        _check("evidence_hash_present", True,
               lambda a: isinstance(a.get("evidence_hash"), str) and len(a["evidence_hash"]) == 64),
        _check("evidence_rebound", True,  # rebind evidence by hash at publish
               lambda a: a.get("evidence_hash") == _evidence_hash(g(a))),
        _check("sample_floor", False, lambda a: (a.get("n") or 0) >= 30),
        _check("calibration_vs_baseline", False,  # hard-block decided in evaluate()
               lambda a: g(a).get("brier", 1.0) <= g(a).get("baseline_brier", 0.0) + 1e-12),
        _check("ece_bound", False, lambda a: g(a).get("adaptive_ece", 1.0) <= 0.02),
        _check("wilson_edge_gate", False,
               lambda a: (not a.get("claims_edge", False))
               or (g(a).get("wilson_lb", 0.0) > WILSON_FLOOR)),
        _check("not_blocked_registry", True,
               lambda a: a.get("artifact_id") not in _blocked_registry),
        _check("version_pinned", False, lambda a: bool(a.get("version"))),
        _check("window_defined", False,
               lambda a: isinstance(a.get("window"), (list, tuple)) and len(a["window"]) == 2
               and a["window"][0] < a["window"][1]),
        _check("provenance_complete", False, lambda a: bool(a.get("provenance_complete"))),
        _check("leakage_attested", False, lambda a: bool(a.get("leakage_attested"))),
        _check("metric_direction_sane", False,  # punchlist: no double-inverted metrics
               lambda a: (g(a).get("baseline_brier", 0.0) - g(a).get("brier", 1.0))
               * (1 if g(a).get("claims_brier_improvement", True) else -1) >= -1e-12),
        _check("conformal_exact_quantile", False,
               lambda a: (not a.get("uses_conformal", False))
               or bool(a.get("exact_quantile_certified"))),
        _check("intervals_present", False,
               lambda a: (not a.get("feeds_picks", False)) or bool(a.get("has_intervals"))),
        _check("independent_derivation", False,  # S3: pin by independent derivation
               lambda a: bool(a.get("test_independent"))),
    ]


def evaluate(artifact):
    """Run the 15-test guard. 15/15 -> SHIP; any hard-block failure -> BLOCKED;
    otherwise HOLD. A8-style calibration disaster (delta >= 0.03 vs baseline) is
    a hard block [INFERENCE]."""
    checks = _checks()
    failed, hard_failed = [], []
    for c in checks:
        try:
            ok = bool(c["fn"](artifact))
        except Exception:
            ok = False
        if not ok:
            failed.append(c["name"])
            if c["hard"]:
                hard_failed.append(c["name"])
    ev = artifact.get("evidence", {}) or {}
    if ev.get("brier", 0.0) - ev.get("baseline_brier", 0.0) >= HARD_BLOCK_BRIER_DELTA:
        hard_failed.append("calibration_disaster")
        if "calibration_vs_baseline" not in failed:
            failed.append("calibration_vs_baseline")
    passed = N_CHECKS - len(failed)
    if hard_failed:
        decision = "BLOCKED"
    elif not failed:
        decision = "SHIP"
    else:
        decision = "HOLD"
    return {
        "decision": decision,
        "passed": passed,
        "failed": failed,
        "hard_failed": hard_failed,
        "n_checks": N_CHECKS,
    }


def publish(artifact):
    """Rebind evidence by hash, then gate. Returns (verdict, artifact-or-None).

    SHIP -> (\"SHIP\", artifact). Anything else -> (\"HOLD\", None): the artifact is
    HELD from publishing; BLOCKED artifacts additionally enter the quarantine
    registry so their numbers can never touch a live pick. [INFERENCE: this
    HOLD-mapping is what the regression test pins -- a known-BLOCKED artifact
    must confirm HOLD at publish.]
    """
    artifact = dict(artifact)
    artifact["evidence_hash"] = _evidence_hash(artifact.get("evidence", {}) or {})
    verdict = evaluate(artifact)
    if verdict["decision"] == "BLOCKED":
        _blocked_registry.add(artifact.get("artifact_id"))
        return "HOLD", None
    if verdict["decision"] == "SHIP":
        return "SHIP", artifact
    return "HOLD", None


def live_pick_value(artifact_id, number):
    """BLOCKED artifacts' numbers never touch a live pick -- quarantined ids raise."""
    if artifact_id in _blocked_registry:
        raise Exception(
            f"artifact {artifact_id!r} is BLOCKED: its numbers are quarantined and "
            "can never touch a live pick"
        )
    return number


def blocked_registry():
    return set(_blocked_registry)
