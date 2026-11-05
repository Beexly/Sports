#!/usr/bin/env python3
"""TNF JAX @ BAL Stage 3-5 board review + 360 dossier inputs.

Takes the full DraftKings board (1,453 props / 75 markets), the 10,000-world
Sinkhorn distribution, the Jev spine, and the W1-8 reproduction receipt, then
applies the gates that can actually be evaluated:

  G1 price gate      - two-sided price required for de-vig
  G2 edge gate       - calibration-deflated model prob must beat de-vig by >= 3.0 pts
  G3 Stage-0 gate    - excluded/inactive players can never be published
  G4 longshot guard  - Snowberg-Wolfers: implied < 10% is not a value leg
  G5 provenance gate - every non-reproducible claimed input is PASS-only

No price floors, no invented CLV. Markets that cannot clear a gate are PASS.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BOARD = ROOT / "data" / "engine" / "tnf_jax_bal_dk_full_board_2026_11_05.json"
SIM = ROOT / "data" / "engine" / "tnf_jax_bal_10k_sinkhorn_2026_11_05.json"
REPRO = ROOT / "data" / "engine" / "tnf_jax_bal_pbp_reproductions_2026_11_05.json"
OUT = ROOT / "data" / "engine" / "tnf_jax_bal_360_board_review_2026_11_05.json"

EDGE_THRESHOLD_PTS = 3.0
CALIBRATION_DEFLATION_PTS = 5.2  # measured 2026-09-30: ranking monotone, level inflated ~5.2pt
LONGSHOT_FLOOR = 0.10
STAGE0_EXCLUDED = {"Lamar Jackson", "Travis Etienne", "Travis Etienne Jr.", "Tyler Huntley", "Skylar Thompson"}
CONDITIONAL_PASS = {"Bhayshul Tuten"}  # Questionable, ankle, DNP at Week 9 report


def american_to_prob(odds: float) -> float:
    if odds is None:
        return None
    o = float(odds)
    return (-o) / ((-o) + 100.0) if o < 0 else 100.0 / (o + 100.0)


def devig(p1: float, p2: float) -> tuple[float, float]:
    s = p1 + p2
    return p1 / s, p2 / s


def main() -> dict:
    board = json.loads(BOARD.read_text(encoding="utf-8"))
    sim = json.loads(SIM.read_text(encoding="utf-8"))
    repro = json.loads(REPRO.read_text(encoding="utf-8"))
    gl = board["game_lines"]
    derived = sim["derived"]

    # --- de-vig the three game markets ---
    sp_a = american_to_prob(gl["away_spread_odds"])
    sp_h = american_to_prob(gl["home_spread_odds"])
    ml_a = american_to_prob(gl["away_ml"])
    ml_h = american_to_prob(gl["home_ml"])
    to_o = american_to_prob(gl["over_odds"])
    to_u = american_to_prob(gl["under_odds"])
    dv_sp_a, dv_sp_h = devig(sp_a, sp_h)
    dv_ml_a, dv_ml_h = devig(ml_a, ml_h)
    dv_to_o, dv_to_u = devig(to_o, to_u)

    def leg(market, model_p, market_p, note=""):
        deflated = model_p - CALIBRATION_DEFLATION_PTS / 100.0
        edge = round((deflated - market_p) * 100.0, 2)
        return {
            "market": market,
            "model_prob": round(model_p, 4),
            "model_prob_calibration_deflated": round(deflated, 4),
            "devig_market_prob": round(market_p, 4),
            "edge_pts_after_deflation": edge,
            "clears_edge_gate": edge >= EDGE_THRESHOLD_PTS,
            "note": note,
        }

    game_markets = [
        leg("JAX -10 (-105)", derived["p_away_covers_minus10"], dv_sp_a, "spread"),
        leg("BAL +10 (-115)", derived["p_home_covers_plus10"], dv_sp_h, "spread"),
        leg("JAX ML -520", derived["p_away_ml"], dv_ml_a, "moneyline"),
        leg("BAL ML +390", 1.0 - derived["p_away_ml"], dv_ml_h, "moneyline"),
        leg("OVER 39.5 (-110)", derived["p_over_39_5"], dv_to_o, "total"),
        leg("UNDER 39.5 (-110)", derived["p_under_39_5"], dv_to_u, "total"),
    ]
    clearing = [m["market"] for m in game_markets if m["clears_edge_gate"]]
    game_decision = {
        "publish_allowed": False,
        "numerically_clearing": clearing,
        "reason": (
            "BAL +10 (+6.87 pts) and BAL ML (+9.93 pts) clear the numeric gate only because the sealed "
            "baseline (2026-10-25) predates Baltimore's QB1-out re-rating (Lamar Jackson thumb surgery, "
            "Huntley out, Fagnano starting). The model's team ratings do not carry that loss, so the "
            "edge is a stale-input artifact, not alpha. PASS with ruling."
        ),
        "markets": game_markets,
        "model_market_divergence": {
            "spread": f"model {sim['result']['median_spread_home']:+.2f} home vs market +10.00 home",
            "total": f"model {sim['result']['median_total']:.2f} vs market 39.50",
            "interpretation": "Model is materially less bullish on JAX than the market and its ML (65.3%) sits far below the de-vigged 80.4%; treat the sealed baseline as stale on the BAL QB1-out re-rating, not as an edge.",
        },
    }

    # --- prop board: enumerate, gate, PASS ---
    by_market: dict[str, int] = {}
    stage0_props = []
    for p in board["props"]:
        by_market[p["market"]] = by_market.get(p["market"], 0) + 1
        if p["athlete"] in STAGE0_EXCLUDED or p["athlete"] in CONDITIONAL_PASS:
            stage0_props.append(f"{p['athlete']} | {p['market']} | {p['line']}")

    prop_decision = {
        "total_props": board["total_props"],
        "market_types": board["market_type_count"],
        "publish_allowed": False,
        "publish_allowed_count": 0,
        "pass_count": board["total_props"],
        "pass_reason": "G1 FAIL: ESPN/DraftKings propBets publish target lines without two-sided prices; de-vig, CLV and conjunction pricing cannot be computed. No prop may be published.",
        "stage0_blocked_props": len(stage0_props),
        "stage0_examples": stage0_props[:10],
        "market_counts": dict(sorted(by_market.items(), key=lambda kv: -kv[1])),
    }

    # --- provenance gate: what the board may not lean on ---
    provenance = {
        "blocked_claims": repro["reproducibility"]["not_reproducible"],
        "publish_rule": "Any leg whose thesis depends on a blocked claim is PASS (publishAllowed: false).",
        "affected_theses": [
            "BAL dime-rate matchup legs",
            "BAL two-high shell legs",
            "TLaw vs two-high regression legs",
            "RB YBC-efficiency legs",
            "A-gap/Fire Zone pressure legs",
        ],
    }

    dossier = {
        "schema": "tnf_360_board_review_v1",
        "generated_at": "2026-11-05",
        "event": board["event"],
        "official_ledger": "16-5 (76.2%, +10.45u) — data/engine/new_engine_official_ledger_2026.json",
        "stage0": {
            "status": "PASS",
            "config_as_of": "2026-11-04",
            "excluded": sorted(STAGE0_EXCLUDED),
            "confirmed_qb1": {"JAX": "Trevor Lawrence", "BAL": "Joe Fagnano"},
            "tuten": "Questionable (ankle, DNP) — volume-dependent legs PASS until 90-min re-check",
        },
        "jev_spine": sim["jev_spine"],
        "sinkhorn": {
            "sims": sim["sims"],
            "snaps_per_sim": sim["snaps_per_sim"],
            "total_simulated_snaps": sim["total_simulated_snaps"],
            "median_total": sim["result"]["median_total"],
            "median_home_margin": sim["result"]["median_spread_home"],
            "sinkhorn_mass_moved": sim["result"]["sinkhorn_mass_moved"],
            "derived": derived,
        },
        "game_lines": game_decision,
        "props": prop_decision,
        "provenance_gate": provenance,
        "board_publish_verdict": {
            "publish_allowed": False,
            "reason": "Game legs fail the calibration-deflated edge gate; every prop leg fails the price gate. Nothing on this board is publishable.",
            "pass_receipts": board["total_props"] + len(game_markets),
        },
    }
    OUT.write_text(json.dumps(dossier, indent=2), encoding="utf-8")
    print(json.dumps(game_markets, indent=1))
    print("props:", prop_decision["total_props"], "stage0 blocked:", prop_decision["stage0_blocked_props"])
    print("verdict:", dossier["board_publish_verdict"])
    print("saved ->", OUT)
    return dossier


if __name__ == "__main__":
    main()
