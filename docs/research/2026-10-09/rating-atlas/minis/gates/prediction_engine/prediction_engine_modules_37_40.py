#!/usr/bin/env python3
"""
prediction_engine_modules_37_40.py — Acceptance evaluation for prediction-engine modules 37-40.

All four are `decision`-family abstention/selection modules from the GSE prediction engine.
Each module: input spec, evaluation function, pass/fail criteria per the ACCEPTANCE GATE
in its JSDoc header (transcribed in docs/gates/GATE-SPECS.md), stamp output.

Modules:
  37. 1901-09192v4 selectivenet-selection-head — learned selection head vs threshold-on-edge
  38. 1905-10964v2 dac-abstention-cleaning — DAC-loss cleaning + retrain vs all-data baseline
  39. 1907-00208v2 gambler-reservation-filter — gambler-loss publish filter vs all-picks
  40. 1911-11253v1 hostile-market-abstain — abstain head vs 1006 governor at matched no-bet rate

Usage: python3 prediction_engine_modules_37_40.py [--manifest PATH] [--output DIR]
Output: JSON stamps to stdout (and --output dir if given).

Manifest format (frozen test window):
  {
    "picks": [
      {"pick_id": str, "predicted_prob": float, "model_edge": float,
       "outcome": 0|1, "line_move": float, "timestamp": str,
       # module 37:
       "selectivenet_selected": bool, "threshold_selected": bool,
       # module 38:
       "dac_abstained": bool, "brier_baseline": float, "brier_retrained": float,
       # module 39:
       "gambler_retained": bool, "roi_retained": float, "roi_all": float,
       # module 40:
       "abstain_head_no_bet": bool, "governor_no_bet": bool,
       "published_correct": bool, "published_total": int}
    ],
    "meta": {"n_picks": int, "window": str}
  }

All four modules are DIAGNOSTIC until evaluated on a real frozen walk-forward manifest.
Synthetic test data is labeled as such; nothing is promoted on synthetic data.
"""

import argparse
import json
import math
import os
import sys
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# Shared statistical helpers
# ---------------------------------------------------------------------------

def mean(xs):
    return sum(xs) / len(xs) if xs else 0.0


def paired_t_stat(diffs):
    """Paired t-statistic for a list of differences. Returns (t, n)."""
    n = len(diffs)
    if n < 2:
        return 0.0, n
    m = mean(diffs)
    var = sum((d - m) ** 2 for d in diffs) / (n - 1)
    if var <= 0:
        return 0.0, n
    se = math.sqrt(var / n)
    return m / se, n


def t_critical_05_two_sided(n):
    """Approximate two-sided t critical value at alpha=0.05. Conservative normal approx for n>=30."""
    if n >= 30:
        return 1.96
    # small-n table
    table = {2: 12.71, 3: 4.30, 4: 3.18, 5: 2.78, 6: 2.57, 7: 2.45, 8: 2.36,
             9: 2.31, 10: 2.26, 15: 2.13, 20: 2.09, 25: 2.06, 29: 2.05}
    return table.get(n, 2.0)


def brier_score(probs, outcomes):
    """Mean squared error between predicted probs and binary outcomes."""
    if not probs:
        return float("nan")
    return mean([(p - y) ** 2 for p, y in zip(probs, outcomes)])


def roi(picks):
    """Level-stakes ROI: mean net return per unit staked. Assumes even-money for simplicity;
    manifest may carry per-pick net_return instead."""
    rets = [p.get("net_return", (1.0 if p["outcome"] == 1 else -1.0)) for p in picks]
    return mean(rets) if rets else 0.0


# ---------------------------------------------------------------------------
# Module 37: 1901-09192v4 selectivenet-selection-head
# ---------------------------------------------------------------------------
# INPUT_SPEC:
#   - selectivenet_selected: bool per pick (learned head, target coverage c=0.30)
#   - threshold_selected: bool per pick (threshold-on-edge baseline, matched coverage)
#   - outcome: 0/1, net_return per pick
# ACCEPTANCE (from GATE-SPECS.md):
#   Pass = ADAPT if selective head beats threshold baseline on test-window ROI of the
#          covered set by >= 2 percentage points at matched 30% coverage AND win-rate
#          lift significant at p<0.05 (paired over picks).
#   Fail = gap < 2pp or insignificant.

MODULE_37_SPEC = {
    "module_id": 37,
    "arxiv_id": "1901-09192v4",
    "file": "decision/1901-09192v4-selectivenet-selection-head.ts",
    "name": "selectivenet_selection_head",
    "description": "Learned selection head (sigmoid gate, c=0.30) vs threshold-on-edge",
    "inputs": ["selectivenet_selected", "threshold_selected", "outcome", "net_return"],
    "criteria": {
        "roi_gap_pp": {"min": 2.0, "note": "selective ROI minus threshold ROI, percentage points"},
        "coverage_target": 0.30,
        "coverage_tolerance_pp": 2.0,
        "win_rate_lift_p": {"max": 0.05, "paired": True},
    },
}

COVERAGE_TOL_PP = 2.0


def eval_module_37(picks):
    sel = [p for p in picks if p.get("selectivenet_selected")]
    thr = [p for p in picks if p.get("threshold_selected")]
    n = len(picks)
    cov_sel = len(sel) / n if n else 0.0
    cov_thr = len(thr) / n if n else 0.0

    roi_sel = roi(sel) * 100  # pp
    roi_thr = roi(thr) * 100
    gap_pp = roi_sel - roi_thr

    # Paired win-rate lift: align on pick_id for picks selected by both or neither pattern.
    # Paired over picks: diff = (sel outcome) - (thr outcome) on the union, treating
    # unselected as 0 contribution is wrong; instead pair on picks selected by at least one.
    by_id = {p["pick_id"]: p for p in picks}
    diffs = []
    for pid, p in by_id.items():
        s = 1.0 if p.get("selectivenet_selected") else 0.0
        t = 1.0 if p.get("threshold_selected") else 0.0
        # contribution difference: selected-and-won minus baseline
        diffs.append(s * p["outcome"] - t * p["outcome"])
    t_stat, n_paired = paired_t_stat(diffs)
    p_significant = abs(t_stat) > t_critical_05_two_sided(n_paired)

    coverage_ok = (abs(cov_sel - 0.30) * 100 <= COVERAGE_TOL_PP
                   and abs(cov_thr - 0.30) * 100 <= COVERAGE_TOL_PP)
    gap_ok = gap_pp >= 2.0

    passed = gap_ok and p_significant and coverage_ok
    return {
        "module": 37,
        "name": MODULE_37_SPEC["name"],
        "pass": passed,
        "n_picks": n,
        "coverage_selectivenet": round(cov_sel, 4),
        "coverage_threshold": round(cov_thr, 4),
        "coverage_ok": coverage_ok,
        "roi_selectivenet_pp": round(roi_sel, 3),
        "roi_threshold_pp": round(roi_thr, 3),
        "roi_gap_pp": round(gap_pp, 3),
        "roi_gap_ok": gap_ok,
        "paired_t": round(t_stat, 3),
        "n_paired": n_paired,
        "win_rate_lift_significant_p05": p_significant,
    }


# ---------------------------------------------------------------------------
# Module 38: 1905-10964v2 dac-abstention-cleaning
# ---------------------------------------------------------------------------
# INPUT_SPEC:
#   - dac_abstained: bool per training game (k+1 abstention head)
#   - brier_baseline: test Brier of all-data model; brier_retrained: test Brier post-cleaning
# ACCEPTANCE:
#   Pass = ADAPT if post-cleaning retrained model beats all-data baseline on test Brier
#          by >= 0.003 with abstained fraction <= 25% of training games.
#   Fail = gain < 0.003 or cleaning removes > 40% (sample destruction).

MODULE_38_SPEC = {
    "module_id": 38,
    "arxiv_id": "1905-10964v2",
    "file": "decision/1905-10964v2-dac-abstention-cleaning.ts",
    "name": "dac_abstention_cleaning",
    "description": "DAC-loss cleaning round + retrain vs all-data baseline on test Brier",
    "inputs": ["dac_abstained", "brier_baseline", "brier_retrained"],
    "criteria": {
        "brier_gain": {"min": 0.003, "note": "baseline Brier minus retrained Brier"},
        "abstained_fraction": {"max_pass": 0.25, "max_fail_hard": 0.40},
    },
}


def eval_module_38(train_games, brier_baseline, brier_retrained):
    n = len(train_games)
    n_abstained = sum(1 for g in train_games if g.get("dac_abstained"))
    frac = n_abstained / n if n else 0.0
    gain = brier_baseline - brier_retrained  # positive = retrained is better

    gain_ok = gain >= 0.003
    frac_ok = frac <= 0.25
    destroyed = frac > 0.40

    passed = gain_ok and frac_ok and not destroyed
    return {
        "module": 38,
        "name": MODULE_38_SPEC["name"],
        "pass": passed,
        "n_train": n,
        "n_abstained": n_abstained,
        "abstained_fraction": round(frac, 4),
        "abstained_fraction_ok": frac_ok,
        "sample_destruction": destroyed,
        "brier_baseline": round(brier_baseline, 5),
        "brier_retrained": round(brier_retrained, 5),
        "brier_gain": round(gain, 5),
        "brier_gain_ok": gain_ok,
    }


# ---------------------------------------------------------------------------
# Module 39: 1907-00208v2 gambler-reservation-filter
# ---------------------------------------------------------------------------
# INPUT_SPEC:
#   - gambler_retained: bool per pick (reservation head post-hoc filter)
#   - outcome / net_return per pick; time-ordered test window
# ACCEPTANCE:
#   Pass = ADOPT iff retained-picks ROI exceeds all-picks baseline ROI by >= 2pp
#          AND retention >= 60% (anti-degenerate floor).
#   Fail = either clause unmet.

MODULE_39_SPEC = {
    "module_id": 39,
    "arxiv_id": "1907-00208v2",
    "file": "decision/1907-00208v2-gambler-reservation-filter.ts",
    "name": "gambler_reservation_filter",
    "description": "Gambler-loss reservation head as post-hoc publish filter",
    "inputs": ["gambler_retained", "outcome", "net_return"],
    "criteria": {
        "roi_gap_pp": {"min": 2.0, "note": "retained ROI minus all-picks ROI"},
        "retention": {"min": 0.60, "note": "anti-degenerate floor"},
    },
}


def eval_module_39(picks):
    retained = [p for p in picks if p.get("gambler_retained")]
    n = len(picks)
    retention = len(retained) / n if n else 0.0

    roi_ret = roi(retained) * 100
    roi_all = roi(picks) * 100
    gap_pp = roi_ret - roi_all

    gap_ok = gap_pp >= 2.0
    retention_ok = retention >= 0.60

    passed = gap_ok and retention_ok
    return {
        "module": 39,
        "name": MODULE_39_SPEC["name"],
        "pass": passed,
        "n_picks": n,
        "n_retained": len(retained),
        "retention": round(retention, 4),
        "retention_ok": retention_ok,
        "roi_retained_pp": round(roi_ret, 3),
        "roi_all_pp": round(roi_all, 3),
        "roi_gap_pp": round(gap_pp, 3),
        "roi_gap_ok": gap_ok,
    }


# ---------------------------------------------------------------------------
# Module 40: 1911-11253v1 hostile-market-abstain
# ---------------------------------------------------------------------------
# INPUT_SPEC:
#   - abstain_head_no_bet: bool per pick (explicit abstain output)
#   - governor_no_bet: bool per pick (1006 governor baseline)
#   - outcome: 0/1 (wrong pick = predicted wrong)
# ACCEPTANCE:
#   Pass = ADOPT if abstain head cuts outright-wrong-pick rate by >= 40% relative to
#          the 1006 governor at the SAME no-bet rate (+/-2pp), with no loss of hit
#          rate on the published set.
#   Fail = otherwise REJECT.

MODULE_40_SPEC = {
    "module_id": 40,
    "arxiv_id": "1911-11253v1",
    "file": "decision/1911-11253v1-hostile-market-abstain.ts",
    "name": "hostile_market_abstain",
    "description": "Explicit abstain head vs 1006 governor at matched no-bet rate",
    "inputs": ["abstain_head_no_bet", "governor_no_bet", "outcome"],
    "criteria": {
        "wrong_pick_rate_reduction": {"min_relative": 0.40},
        "no_bet_rate_match_pp": {"tolerance": 2.0},
        "hit_rate_no_loss": True,
    },
}


def eval_module_40(picks):
    n = len(picks)
    head_nb = [p for p in picks if p.get("abstain_head_no_bet")]
    gov_nb = [p for p in picks if p.get("governor_no_bet")]
    head_pub = [p for p in picks if not p.get("abstain_head_no_bet")]
    gov_pub = [p for p in picks if not p.get("governor_no_bet")]

    nb_rate_head = len(head_nb) / n if n else 0.0
    nb_rate_gov = len(gov_nb) / n if n else 0.0
    rate_match_ok = abs(nb_rate_head - nb_rate_gov) * 100 <= 2.0

    # Outright-wrong-pick rate on the published set
    def wrong_rate(ps):
        return mean([1.0 - p["outcome"] for p in ps]) if ps else 0.0

    wr_head = wrong_rate(head_pub)
    wr_gov = wrong_rate(gov_pub)
    reduction = (wr_gov - wr_head) / wr_gov if wr_gov > 0 else 0.0
    reduction_ok = reduction >= 0.40

    # Hit rate on published set: no loss vs governor
    hit_head = mean([p["outcome"] for p in head_pub]) if head_pub else 0.0
    hit_gov = mean([p["outcome"] for p in gov_pub]) if gov_pub else 0.0
    hit_ok = hit_head >= hit_gov - 1e-9

    passed = reduction_ok and rate_match_ok and hit_ok
    return {
        "module": 40,
        "name": MODULE_40_SPEC["name"],
        "pass": passed,
        "n_picks": n,
        "no_bet_rate_head": round(nb_rate_head, 4),
        "no_bet_rate_governor": round(nb_rate_gov, 4),
        "no_bet_rate_match_ok": rate_match_ok,
        "wrong_rate_head_published": round(wr_head, 4),
        "wrong_rate_governor_published": round(wr_gov, 4),
        "wrong_rate_reduction_relative": round(reduction, 4),
        "reduction_ok": reduction_ok,
        "hit_rate_head": round(hit_head, 4),
        "hit_rate_governor": round(hit_gov, 4),
        "hit_rate_no_loss": hit_ok,
    }


# ---------------------------------------------------------------------------
# Stamp + runner
# ---------------------------------------------------------------------------

MODULE_SPECS = {
    37: MODULE_37_SPEC,
    38: MODULE_38_SPEC,
    39: MODULE_39_SPEC,
    40: MODULE_40_SPEC,
}


def stamp(module_id, evaluation, manifest_meta=None):
    return {
        "module_id": module_id,
        "module_name": MODULE_SPECS[module_id]["name"],
        "arxiv_id": MODULE_SPECS[module_id]["arxiv_id"],
        "file": MODULE_SPECS[module_id]["file"],
        "stamped_at": datetime.now(timezone.utc).isoformat(),
        "infrastructure": "PASS",
        "result": "PASS" if evaluation["pass"] else "REFUSE",
        "spec": MODULE_SPECS[module_id],
        "evaluation": evaluation,
        "manifest_meta": manifest_meta or {},
        "label": "DIAGNOSTIC",
    }


def run_all(manifest):
    picks = manifest.get("picks", [])
    meta = manifest.get("meta", {})
    results = {}

    results[37] = stamp(37, eval_module_37(picks), meta)

    # Module 38 needs train games + Brier numbers
    train_games = manifest.get("train_games", picks)
    brier_base = manifest.get("brier_baseline", float("nan"))
    brier_retr = manifest.get("brier_retrained", float("nan"))
    if math.isnan(brier_base) or math.isnan(brier_retr):
        # Fall back: compute Brier from pick probs if present
        probs = [p["predicted_prob"] for p in picks if "predicted_prob" in p]
        outs = [p["outcome"] for p in picks if "predicted_prob" in p]
        brier_base = brier_score(probs, outs)
        # Without a retrained model we cannot evaluate; mark unevaluable honestly
        eval38 = {
            "module": 38, "name": MODULE_38_SPEC["name"], "pass": False,
            "note": "brier_retrained not provided; cannot evaluate DAC cleaning gain. "
                    "Requires retrained-model test Brier from training pipeline.",
            "brier_baseline": brier_base,
        }
    else:
        eval38 = eval_module_38(train_games, brier_base, brier_retr)
    results[38] = stamp(38, eval38, meta)

    results[39] = stamp(39, eval_module_39(picks), meta)
    results[40] = stamp(40, eval_module_40(picks), meta)
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", default=None, help="Path to frozen test manifest JSON")
    ap.add_argument("--output", default=None, help="Directory for stamp JSON files")
    args = ap.parse_args()

    if args.manifest:
        with open(args.manifest) as f:
            manifest = json.load(f)
    else:
        # Built-in smoke manifest: clearly labeled synthetic, for infrastructure testing only.
        # NOT a real evaluation — stamps will show synthetic source.
        manifest = {"picks": [], "meta": {"source": "SYNTHETIC_SMOKE_EMPTY",
                                          "note": "Empty pick list; modules unevaluable."}}

    results = run_all(manifest)
    if args.output:
        os.makedirs(args.output, exist_ok=True)
        for mid, st in results.items():
            with open(os.path.join(args.output, f"module_{mid}_stamp.json"), "w") as f:
                json.dump(st, f, indent=2)
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
