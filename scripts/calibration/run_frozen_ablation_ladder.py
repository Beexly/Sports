"""Walk-Forward Frozen Ablation Ladder Runner (`scripts/calibration/run_frozen_ablation_ladder.py`).

Evaluates every JSON config under `configs/ablation_ladder/` strictly walk-forward using
the immutable frozen scorer (`evaluation/frozen/score_walkforward_calibration_v1.py`) across:
  1. Synthetic timestamped settled JSONL (`scripts/calibration-offline/data/synthetic-settled.jsonl`)
  2. Real settled market JSONLs (`real-moneyline.jsonl`, `real-spread.jsonl`, `real-total.jsonl`)
  3. Real NFL 2026 player-week walk-forward WR/TE reception props (`data/nflverse/stats_player_week_2026_w1_w10.parquet`)
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Any

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from evaluation.frozen.score_walkforward_calibration_v1 import (  # noqa: E402
    apply_calibration_transform,
    paired_brier_empirical_bernstein_lcb,
    score_predictions,
)

CONFIG_DIR = REPO_ROOT / "configs" / "ablation_ladder"
OFFLINE_DATA_DIR = REPO_ROOT / "scripts" / "calibration-offline" / "data"
NFLVERSE_2026 = REPO_ROOT / "data" / "nflverse" / "stats_player_week_2026_w1_w10.parquet"
RECEIPT_PATH = (
    REPO_ROOT / "docs" / "engine" / "research" / "2026-11-20" / "frozen-ablation-ladder-receipt.json"
)


def load_ablation_configs(config_dir: Path = CONFIG_DIR) -> list[dict[str, Any]]:
    configs: list[dict[str, Any]] = []
    for p in sorted(config_dir.glob("*.json")):
        obj = json.loads(p.read_text(encoding="utf-8"))
        obj["_config_file"] = p.name
        configs.append(obj)
    return configs


def _load_jsonl_series(path: Path) -> tuple[list[float], list[int], list[float] | None]:
    rows = [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]
    has_ts = any(("settledAt" in r or "settled_at" in r or "t" in r) for r in rows)
    if has_ts:
        rows.sort(key=lambda r: float(r.get("settledAt") or r.get("settled_at") or r.get("t") or 0.0))
    probs = [float(r.get("p_model") if r.get("p_model") is not None else r.get("p", 0.5)) for r in rows]
    outcomes = [int(r.get("y", r.get("outcome", 0))) for r in rows]
    has_clv = any(r.get("clvValue") is not None for r in rows)
    clv = [float(r["clvValue"]) for r in rows if r.get("clvValue") is not None] if has_clv and all(r.get("clvValue") is not None for r in rows) else None
    return probs, outcomes, clv


def _build_nflverse_wr_te_walkforward_series() -> tuple[list[float], list[int]]:
    df = pd.read_parquet(NFLVERSE_2026)
    sub = df[(df["position"].isin(["WR", "TE"])) & (df["targets"] >= 2)].sort_values(
        ["player_id", "week"]
    )
    probs: list[float] = []
    outcomes: list[int] = []
    # Strictly causal: prior weeks < w predict whether player clears 38.5 rec yds in week w
    for _, grp in sub.groupby("player_id"):
        rows = grp.to_dict("records")
        if len(rows) < 3:
            continue
        for idx in range(2, len(rows)):
            prior = rows[:idx]
            curr = rows[idx]
            if int(curr.get("week", 0)) < 4:
                continue
            avg_yds = sum(float(r.get("receiving_yards", 0.0) or 0.0) for r in prior) / float(len(prior))
            shrunk = (len(prior) / (len(prior) + 4.0)) * avg_yds + (4.0 / (len(prior) + 4.0)) * 38.5
            z = (shrunk - 38.5) / 24.0
            p = 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))
            probs.append(min(0.95, max(0.05, p)))
            outcomes.append(1 if float(curr.get("receiving_yards", 0.0) or 0.0) > 38.5 else 0)
    return probs, outcomes


def evaluate_slice_walkforward(
    slice_name: str,
    probs: list[float],
    outcomes: list[int],
    clv: list[float] | None,
    configs: list[dict[str, Any]],
) -> dict[str, Any]:
    cut = max(20, int(0.60 * len(probs)))
    tr_p, tr_y = probs[:cut], outcomes[:cut]
    te_p, te_y = probs[cut:], outcomes[cut:]
    te_clv = clv[cut:] if clv is not None else None

    raw_preds, _ = apply_calibration_transform(te_p, temp_scale=1.0, conformal_shrinkage=0.0)
    runs: dict[str, Any] = {}
    for cfg in configs:
        name = str(cfg["name"])
        preds, va_width = apply_calibration_transform(
            te_p,
            temp_scale=float(cfg.get("temp_scale", 1.0)),
            conformal_shrinkage=float(cfg.get("conformal_shrinkage", 0.0)),
            venn_abers_weight=float(cfg.get("venn_abers_weight", 0.0)),
            aci_gamma=float(cfg.get("aci_gamma", 0.0)),
            train_p=tr_p,
            train_y=tr_y,
            test_y=te_y,
        )
        metrics = score_predictions(te_y, preds, clv_values=te_clv, config=cfg)
        eb_vs_raw = paired_brier_empirical_bernstein_lcb(te_y, raw_preds, preds)
        runs[name] = {
            **metrics,
            "mean_venn_abers_width": round(va_width, 6),
            "eb_vs_raw_mean_imp": eb_vs_raw["mean_improvement"],
            "eb_vs_raw_lcb": eb_vs_raw["lcb"],
        }
    return {
        "slice": slice_name,
        "train_n": len(tr_p),
        "test_n": len(te_p),
        "configs": runs,
    }


def run_all_ablations(write_receipt: bool = True) -> dict[str, Any]:
    configs = load_ablation_configs()
    slices: list[tuple[str, list[float], list[int], list[float] | None]] = []

    syn_p, syn_y, syn_clv = _load_jsonl_series(OFFLINE_DATA_DIR / "synthetic-settled.jsonl")
    slices.append(("synthetic_settled", syn_p, syn_y, syn_clv))

    for market in ("moneyline", "spread", "total"):
        p, y, c = _load_jsonl_series(OFFLINE_DATA_DIR / f"real-{market}.jsonl")
        slices.append((f"real_{market}", p, y, c))

    wr_p, wr_y = _build_nflverse_wr_te_walkforward_series()
    slices.append(("nflverse_2026_wr_te_rec_38_5", wr_p, wr_y, None))

    slice_results = [
        evaluate_slice_walkforward(name, p, y, c, configs)
        for name, p, y, c in slices
    ]
    report = {
        "schema": "gse_frozen_ablation_ladder_v1",
        "scorer": "evaluation/frozen/score_walkforward_calibration_v1.py",
        "config_count": len(configs),
        "slices": slice_results,
    }
    if write_receipt:
        RECEIPT_PATH.parent.mkdir(parents=True, exist_ok=True)
        RECEIPT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    return report


if __name__ == "__main__":
    out = run_all_ablations(write_receipt=True)
    for sl in out["slices"]:
        raw = sl["configs"]["ladder_0_raw"]
        va = sl["configs"]["ladder_3_venn_abers_shrink"]
        aci = sl["configs"].get("ladder_4_aci_online") or {}
        print(
            f"{sl['slice']} (test_n={sl['test_n']}): raw[brier={raw['brier']}, ece={raw['ece']}] "
            f"-> venn_abers[brier={va['brier']}, ece={va['ece']}, eb_lcb={va['eb_vs_raw_lcb']}] "
            f"-> aci[brier={aci.get('brier')}, ece={aci.get('ece')}]"
        )
