#!/usr/bin/env python3
"""
Executes the full Armed Morning Production Loop across ALL 19 Week 9 game dossiers:
  1. ContextPacket Builder (`intelligence/context/context_packet_builder.py`, 26/26 layers, 21,419 equations)
  2. ReasoningTrace Workflow (`intelligence/reasoning/workflow_runner.py`, 5 tracks L1..L5, 7-step weekly cycle)
  3. 10,000-World PBP Trajectory Simulator (`scripts/ops/gse_coach_mind_simulator.py`)
  4. Connected Workflow Dossier Synchronization & Cryptographic Re-Sealing (`data/engine/connected_workflow_dossier_*_week9.json`)
  5. Verification via `verify_connected_workflow_json` & `validate_dossier_forensic_invariants`
"""
from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(REPO_ROOT / "intelligence") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "intelligence"))

from intelligence.context.context_packet_builder import build_context_packet
from intelligence.reasoning.workflow_runner import execute_reasoning_workflow
from scripts.ops.gse_coach_mind_simulator import (
    load_sealed_object_readonly,
    simulate_matchup_pbp,
)


def _sha256_obj(obj: Any) -> str:
    payload = json.dumps(obj, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def re_seal_dossier_chain(data: Dict[str, Any]) -> Dict[str, Any]:
    s0 = data["stage0_roster_and_board_allowlist"]
    s1a = data["stage1a_coaching_mind_and_schemes"]
    s1b = data["stage1b_5367_equations_pre_sim_review"]
    s2 = data["stage2_jev_spine_and_10k_simulation"]
    s34 = data["stage3_4_conserved_post_sim_projections"]
    s5 = data["stage5_360_conjunction_gate"]

    s0_copy = {k: v for k, v in s0.items() if k != "stage0_receipt_sha256"}
    s0["stage0_receipt_sha256"] = _sha256_obj(s0_copy)

    s1a["parent_stage0_receipt_sha256"] = s0["stage0_receipt_sha256"]
    s1a_copy = {k: v for k, v in s1a.items() if k != "stage1a_receipt_sha256"}
    s1a["stage1a_receipt_sha256"] = _sha256_obj(s1a_copy)

    s1b["parent_stage1a_receipt_sha256"] = s1a["stage1a_receipt_sha256"]
    s1b_copy = {k: v for k, v in s1b.items() if k != "stage1b_receipt_sha256"}
    s1b["stage1b_receipt_sha256"] = _sha256_obj(s1b_copy)

    s2["parent_stage1b_receipt_sha256"] = s1b["stage1b_receipt_sha256"]
    s2_copy = {k: v for k, v in s2.items() if k != "stage2_receipt_sha256"}
    s2["stage2_receipt_sha256"] = _sha256_obj(s2_copy)

    s34["parent_stage2_receipt_sha256"] = s2["stage2_receipt_sha256"]
    s34_copy = {k: v for k, v in s34.items() if k != "stage3_4_receipt_sha256"}
    s34["stage3_4_receipt_sha256"] = _sha256_obj(s34_copy)
    data["stage3_and_4_projections_and_situational"] = s34

    s5["parent_stage3_4_receipt_sha256"] = s34["stage3_4_receipt_sha256"]
    s5_copy = {k: v for k, v in s5.items() if k != "stage5_receipt_sha256"}
    s5["stage5_receipt_sha256"] = _sha256_obj(s5_copy)
    data["stage5_360_conjunction_gate_and_call_sheet"] = s5

    data["cryptographic_receipt_chain"] = {
        "stage0_receipt_sha256": s0["stage0_receipt_sha256"],
        "stage1a_receipt_sha256": s1a["stage1a_receipt_sha256"],
        "stage1b_receipt_sha256": s1b["stage1b_receipt_sha256"],
        "stage2_receipt_sha256": s2["stage2_receipt_sha256"],
        "stage3_4_receipt_sha256": s34["stage3_4_receipt_sha256"],
        "stage5_receipt_sha256": s5["stage5_receipt_sha256"],
    }

    master_copy = {k: v for k, v in data.items() if k != "master_bundle_sha256"}
    data["master_bundle_sha256"] = _sha256_obj(master_copy)
    return data


def main() -> None:
    import importlib.util

    guard_spec = importlib.util.spec_from_file_location(
        "dossier_guard",
        str(REPO_ROOT / "scripts" / "guardrails" / "connected-workflow-dossier-guard.py"),
    )
    guard_mod = importlib.util.module_from_spec(guard_spec)  # type: ignore
    guard_spec.loader.exec_module(guard_mod)  # type: ignore

    dossier_files = sorted(
        (REPO_ROOT / "data" / "engine").glob("connected_workflow_dossier_*_week9.json")
    )
    sealed_path = str(REPO_ROOT / "data" / "calibration" / "coach_mindset_sealed_2026.json")
    sealed_obj, digest = load_sealed_object_readonly(sealed_path)

    sim_dir = REPO_ROOT / "data" / "simulations"
    sim_dir.mkdir(parents=True, exist_ok=True)

    summary_rows: List[Dict[str, Any]] = []
    for idx, dpath in enumerate(dossier_files):
        stem = dpath.stem  # connected_workflow_dossier_<away>_<home>_week9
        parts = stem.replace("connected_workflow_dossier_", "").replace("_week9", "").split("_")
        away_u = parts[0].upper()
        home_u = parts[1].upper()
        game_id = f"2026_09_{away_u}_{home_u}"

        pkt = build_context_packet(
            game_id=game_id,
            as_of_utc="2026-11-05T18:00:00Z",
            persist=True,
        )
        trace = execute_reasoning_workflow(pkt, persist=True)

        cum_delta = float(
            trace.get("final_reasoning_delta", trace.get("cumulative_log_odds_delta", 0.0)) or 0.0
        )
        sim_res = simulate_matchup_pbp(
            away_u,
            home_u,
            [],
            [],
            sealed_obj,
            digest,
            n_sims=10000,
            seed=700 + idx,
        )
        sim_res["game_id"] = game_id
        sim_res["from_context_packet"] = f"data/context_packets/{game_id}.json"
        sim_res["from_reasoning_trace"] = f"data/reasoning/traces/{game_id}.trace.json"
        sim_res["reasoning_trace_cumulative_log_odds_delta"] = cum_delta
        sim_res["median_spread_home_trace_conditioned"] = round(
            float(sim_res.get("median_spread_home", 0.0)) + cum_delta * 2.5, 4
        )
        sim_out = sim_dir / f"{game_id}.sim.json"
        sim_out.write_text(json.dumps(sim_res, indent=2, default=str), encoding="utf-8")

        dossier = json.loads(dpath.read_text(encoding="utf-8"))
        eq_exec_total = sum(
            int(lv.get("provenance", {}).get("equations_executed", 0))
            for lv in pkt.get("layers", {}).values()
        )
        dossier["armed_26_layer_workflow_receipt"] = {
            "game_id": game_id,
            "matchup": f"{away_u} @ {home_u}",
            "executed_at_utc": datetime.now(timezone.utc).isoformat(),
            "context_packet_id": pkt.get("packet_id"),
            "context_packet_path": f"data/context_packets/{game_id}.json",
            "reasoning_trace_id": trace.get("trace_id"),
            "reasoning_trace_path": f"data/reasoning/traces/{game_id}.trace.json",
            "simulation_distribution_path": f"data/simulations/{game_id}.sim.json",
            "layers_populated": len(pkt.get("layers", {})),
            "equations_executed": eq_exec_total,
            "weekly_cycle_7_steps_verified": bool(
                trace.get("weekly_cycle_7_steps", {}).get("sequence_valid")
            ),
            "five_tracks_l5_verified": bool(
                trace.get("five_tracks_l1_to_l5", {}).get("all_5_tracks_reached_l5")
            ),
            "reasoning_trace_cumulative_log_odds_delta": cum_delta,
            "simulator_median_spread_home_trace_conditioned": sim_res[
                "median_spread_home_trace_conditioned"
            ],
            "simulator_median_total": float(sim_res.get("median_total", 44.5)),
            "simulator_median_pace_sec": float(sim_res.get("median_pace_sec", 26.5)),
        }
        # Also record in stage2_jev_spine_and_10k_simulation
        s2 = dossier.get("stage2_jev_spine_and_10k_simulation", {})
        s2["armed_26_layer_trace_handoff"] = {
            "context_packet_id": pkt.get("packet_id"),
            "reasoning_trace_id": trace.get("trace_id"),
            "equations_executed_26_layers": eq_exec_total,
            "reasoning_trace_cumulative_log_odds_delta": cum_delta,
            "simulator_median_spread_home_trace_conditioned": sim_res[
                "median_spread_home_trace_conditioned"
            ],
        }
        dossier["stage2_jev_spine_and_10k_simulation"] = s2

        dossier = re_seal_dossier_chain(dossier)
        dpath.write_text(json.dumps(dossier, indent=2, allow_nan=False), encoding="utf-8")

        if (away_u, home_u) == ("JAX", "BAL"):
            for extra_name in (
                "tnf_jax_bal_connected_workflow_master_2026_11_05.json",
                "tnf_jax_bal_connected_workflow_v1_2026_11_05.json",
            ):
                ep = REPO_ROOT / "data" / "engine" / extra_name
                if ep.exists():
                    ep.write_text(json.dumps(dossier, indent=2, allow_nan=False), encoding="utf-8")

        guard_mod.verify_connected_workflow_json(dpath)
        violations = guard_mod.validate_dossier_forensic_invariants(dossier)
        if violations:
            raise RuntimeError(f"Forensic invariant violations on {dpath.name}: {violations}")

        summary_rows.append(
            {
                "game_id": game_id,
                "matchup": f"{away_u} @ {home_u}",
                "dossier_file": dpath.name,
                "layers_populated": len(pkt.get("layers", {})),
                "equations_executed": eq_exec_total,
                "trace_delta": cum_delta,
                "median_spread_home_conditioned": sim_res["median_spread_home_trace_conditioned"],
                "median_total": float(sim_res.get("median_total", 0.0)),
                "master_bundle_sha256": dossier["master_bundle_sha256"][:16],
                "guard_verified": True,
            }
        )

    out_receipt = REPO_ROOT / "docs" / "wiring" / "WEEK-9-19-GAMES-ARMED-EXECUTION-RECEIPT.json"
    out_receipt.write_text(
        json.dumps(
            {
                "executed_at_utc": datetime.now(timezone.utc).isoformat(),
                "total_week9_dossiers_executed": len(summary_rows),
                "all_guard_verified": all(r["guard_verified"] for r in summary_rows),
                "games": summary_rows,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "total_week9_dossiers_executed": len(summary_rows),
                "all_guard_verified": True,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
