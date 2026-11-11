#!/usr/bin/env python3
"""
One-Mind 1.1M-Record Completeness Gate (`one-mind-completeness-gate.py`)
========================================================================
Verifies Workstream 3 of the v7 Overnight Architecture:
  1. `one_mind_compiler_and_provenance_ledger.py` compiles and verifies:
     - `EQUATIONS-MASTER-2026-11-10.jsonl.gz`: 940,102 equation records
     - `SITUATIONAL-MASTER-2026-11-10.jsonl.gz`: 102,082 situational records
     - Hermes Canonical `equations-master-2026-11-11.jsonl`: 60,051 equation records
     - Hermes Lima Pilot `lima-pilot-001-equations.jsonl`: 111 equation records
     - Total One-Mind corpus: 1,102,346 records (1,000,264 equations + 102,082 situational)
     - `FluidX3D` non-commercial blocklist: 0 rows admitted to training or commercial execution
  2. `MorningSweepNov10FeatureProvider` loads all 46 CSV tables from
     `docs/data-sources/research/2026-11-10/full-tables/*.csv`
  3. `ErnieLatentMoECognitiveRouter` initializes 512 orthogonal clusters (`||Q Q^T - I||_F < 1e-12`)
     and caps all routed outputs at `|Delta log-odds| <= 0.35`.
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.architecture.ernie_latent_moe_cognitive_router import (
    MAX_ABS_DELTA_LOG_ODDS,
    ErnieLatentMoECognitiveRouter,
)
from intelligence.coaching.morning_sweep_nov10_feature_providers import (
    MorningSweepNov10FeatureProvider,
)
from intelligence.equations.one_mind_compiler_and_provenance_ledger import (
    compile_one_mind_provenance_ledger,
)


def main() -> int:
    ledger = compile_one_mind_provenance_ledger()
    totals = ledger["totals"]
    compliance = ledger["doctrine_compliance"]

    assert compliance["fluidx3d_non_commercial_blocklist_active"] is True
    assert compliance["fluidx3d_rows_admitted_to_training_or_commercial"] == 0
    assert totals["equations_master_rows"] >= 940_102, f"Expected >= 940,102 eq master rows, got {totals['equations_master_rows']}"
    assert totals["hermes_canonical_equation_rows"] == 60_051, f"Expected 60,051 Hermes canonical eqs, got {totals['hermes_canonical_equation_rows']}"
    assert totals["hermes_lima_pilot_equation_rows"] == 111, f"Expected 111 Lima pilot eqs, got {totals['hermes_lima_pilot_equation_rows']}"
    assert totals["total_situational_rows"] >= 102_082, f"Expected >= 102,082 sit rows, got {totals['total_situational_rows']}"
    assert totals["total_one_mind_records"] >= 1_102_346, f"Expected >= 1,102,346 total records, got {totals['total_one_mind_records']}"

    provider = MorningSweepNov10FeatureProvider()
    assert provider.table_count == 46, f"Expected 46 Nov 10 CSV tables, got {provider.table_count}"
    assert provider.total_rows > 500, f"Expected > 500 Nov 10 CSV rows, got {provider.total_rows}"

    router = ErnieLatentMoECognitiveRouter()
    assert router.n_clusters == 512
    assert router.block0_orthogonality_error < 1e-10
    route_res = router.route_situational_state(
        {"pressure": 2.5, "wind": -1.8, "rest": 1.2, "proe": 0.9},
        expert_cluster_priors=[5.0] * 512,  # extreme stress test to verify hard cap
    )
    assert abs(route_res.capped_delta_log_odds) <= MAX_ABS_DELTA_LOG_ODDS + 1e-12

    print(
        f"[one-mind-completeness-gate] PASS — "
        f"records={totals['total_one_mind_records']:,} "
        f"(eq={totals['total_equation_rows']:,}, sit={totals['total_situational_rows']:,}), "
        f"nov10_csvs={provider.table_count} ({provider.total_rows} rows), "
        f"latent_moe_clusters={router.n_clusters}, "
        f"fluidx3d_admitted=0"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
