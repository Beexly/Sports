# Provenance: newregime module — the new-regime prediction module.
#
# Implements the syntheses.md S5 "MAML vs NGGP race" plus its supporting lanes:
#   - 1912 MAML 1-5-step adapter on 2-4 games (>=0.02 Brier gate) — maml.py
#   - 1902 NGGP few-shot GP with calibrated uncertainty (>=0.01 Brier gate) — nggp.py
#   - SYS-28 feature store with (event_ts, creation_ts) semantics — feature_store.py
#   - SYS-30 drift-detection ensemble — drift.py
#   - SYS-13/14/15/17 gated RESEARCH-GRADE lanes — research_lanes.py
#   - SYS-31 QB Phase-2 rusty-backup archetype — rusty_backup.py
#
# Source docs: ~/workspace/corpus-intelligence/deep/c10/syntheses.md (S5),
#               ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md,
#               ~/workspace/corpus-intelligence/deep/c10/verified-claims.md,
#               ~/workspace/corpus-intelligence/deep/c10/challenges.md.
#
# DATA BASIS (honesty header): every gate in this package is validated on
# SEEDED SYNTHETIC DGPs (dgp.py). No real rookie-QB / new-HC game data, no
# real 2024 weekly features, no real NGS/odds rows exist in this sandbox.
# INFERENCE is labeled as inference in docstrings and result dicts.

"""New-regime prediction module: MAML vs NGGP race + supporting lanes."""

from .maml import maml_new_regime_check
from .nggp import nggp_new_regime_check
from .feature_store import FeatureStore, BackfillRunner, leak_injection_test
from .drift import (DriftEnsemble, drift_acceptance_check, knn_impute,
                    ADWIN, HDDM_A, HDDM_W, KSWIN, PageHinkley)
from .research_lanes import (all_research_lanes, EstimandTaxonomy,
                             ResearchGradeNotEvaluated, STATUS_UNTESTED)
from .rusty_backup import (is_layoff_return, blanket_candidate,
                           archetype_flag)


def research_lanes_status():
    """Report every research lane's gate and current status.

    Per Garrett's INGEST-AND-LEARN doctrine: UNTESTED defaults to
    "UNTESTED — QUEUED FOR EVALUATION", never SKIP/DEAD. The four SYS-13/14/
    15/17 lanes are RESEARCH-GRADE stubs (their evaluate() raises rather than
    faking numbers); SYS-31's rule is implemented with its backtest gate
    pending.
    """
    lanes = [lane.status_dict() for lane in all_research_lanes()]
    from . import rusty_backup
    lanes.append(rusty_backup.research_lane_status())
    lanes.append({
        "name": "MAML vs NGGP new-regime race (S5 bake-off)",
        "sys_id": "S5/1912/1902",
        "summary": ("bake off both adapters on post-roster-shock windows; "
                    "adopt the winner under its gate"),
        "gate": "MAML brier_improvement >= 0.02; NGGP brier_improvement >= 0.01",
        "status": "TESTED on seeded synthetic DGPs (see maml/nggp checks)",
        "gate_cleared": bool(maml_new_regime_check()["gate_cleared"]
                             and nggp_new_regime_check()["gate_cleared"]),
        "research_grade": False,
        "production_use": ("gated: both cleared on synthetic DGPs; production "
                           "adoption needs the same gates on real new-regime "
                           "windows"),
    })
    return {"lanes": lanes}


__all__ = [
    "maml_new_regime_check",
    "nggp_new_regime_check",
    "research_lanes_status",
    "FeatureStore",
    "BackfillRunner",
    "leak_injection_test",
    "DriftEnsemble",
    "drift_acceptance_check",
    "knn_impute",
    "ADWIN",
    "HDDM_A",
    "HDDM_W",
    "KSWIN",
    "PageHinkley",
    "all_research_lanes",
    "EstimandTaxonomy",
    "ResearchGradeNotEvaluated",
    "STATUS_UNTESTED",
    "is_layoff_return",
    "blanket_candidate",
    "archetype_flag",
]
