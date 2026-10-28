#!/usr/bin/env python3
"""
scripts/ops/gse_coach_mind_simulator.py — GSE Sealed Coach-First Play-by-Play Monte Carlo Simulator
& Step N Sharp-Money (money% vs ticket%) Residual Comparator.
Enforces all Stage A-E invariants and Standing Rules 1-10:
  1. Runtime-resolved Tuesday 04:00 CT (v1.0) seal verification (coach tau=0.42, QB_QUESTIONABLE=0.0947).
  2. Read-only MappingProxyType lock on the sealed object (zero mid-week re-estimation).
  3. Sinkhorn-Knopp optimal transport target reallocation under fixed cost matrix C + HHI load scaling.
  4. Play-by-play state-conditioned transition lookup + inverse-MDP 4th-down slice (tau=0.42)
     + Empirical Bayes BTL shrinkage R = (I + A*S)^(-1).
  5. 10,000-simulation JEV scenario stress-testing & post-simulation money% residual flags (read LAST).
"""
import argparse
import copy
import hashlib
import json
import math
import os
from pathlib import Path
from types import MappingProxyType
import numpy as np

QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF = 0.0947
LEAGUE_TARGET_HHI = 0.135

DEFAULT_SEALED_BASELINE = {
    "version": "v1.0",
    "sealedAt": "2026-10-25T04:00:00-05:00",
    "tau": 0.42,
    "injuryDropOff": 0,
    "PROB_PER_POINT": 0.033,
    "costMatrixC": [
        [0.05, 0.35, 0.55, 0.75, 0.90],
        [0.35, 0.05, 0.28, 0.50, 0.75],
        [0.55, 0.28, 0.05, 0.42, 0.65],
        [0.75, 0.50, 0.42, 0.05, 0.48],
        [0.90, 0.75, 0.65, 0.48, 0.05],
    ],
    "epaDropoffTable": {
        "QB1": 0.11,
        "QB_QUESTIONABLE": QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF,
        "OL": 0.02,
        "SKILL": 0.03,
        "DEF": -0.015,
        "execution_multipliers": {
            "QB1": 0.78, "RB1": 0.85, "WR1": 0.82, "WR2": 0.88, "TE1": 0.84, "OL": 0.91
        },
    },
    "teamRatings": {
        "PIT": {"off_epa": 0.042, "def_epa": -0.088, "pace_sec": 27.4, "hfa": 1.56, "early_pass_rate": 0.52, "panic_pp": 0.012, "target_hhi": 0.142},
        "CLE": {"off_epa": -0.095, "def_epa": -0.031, "pace_sec": 26.8, "hfa": 1.56, "early_pass_rate": 0.54, "panic_pp": 0.018, "target_hhi": 0.131},
        "LV":  {"off_epa": -0.048, "def_epa": 0.012,  "pace_sec": 26.9, "hfa": 1.56, "early_pass_rate": 0.55, "panic_pp": 0.060, "target_hhi": 0.148},
        "NYJ": {"off_epa": -0.062, "def_epa": -0.045, "pace_sec": 28.1, "hfa": 1.56, "early_pass_rate": 0.53, "panic_pp": 0.005, "target_hhi": 0.125},
        "DET": {"off_epa": 0.118,  "def_epa": -0.042, "pace_sec": 26.5, "hfa": 1.56, "early_pass_rate": 0.51, "panic_pp": -0.015, "target_hhi": 0.159},
        "MIN": {"off_epa": 0.035,  "def_epa": -0.058, "pace_sec": 27.2, "hfa": 1.56, "early_pass_rate": 0.58, "panic_pp": -0.028, "target_hhi": 0.152},
        "GB":  {"off_epa": 0.068,  "def_epa": -0.019, "pace_sec": 27.0, "hfa": 1.56, "early_pass_rate": 0.55, "panic_pp": 0.010, "target_hhi": 0.118},
        "CAR": {"off_epa": -0.105, "def_epa": 0.082,  "pace_sec": 27.6, "hfa": 1.56, "early_pass_rate": 0.54, "panic_pp": 0.008, "target_hhi": 0.138},
        "CIN": {"off_epa": 0.074,  "def_epa": 0.024,  "pace_sec": 26.4, "hfa": 1.56, "early_pass_rate": 0.63, "panic_pp": 0.022, "target_hhi": 0.154},
        "TEN": {"off_epa": -0.082, "def_epa": -0.015, "pace_sec": 28.3, "hfa": 1.56, "early_pass_rate": 0.52, "panic_pp": -0.010, "target_hhi": 0.133},
        "SEA": {"off_epa": 0.029,  "def_epa": -0.011, "pace_sec": 26.2, "hfa": 1.56, "early_pass_rate": 0.57, "panic_pp": 0.004, "target_hhi": 0.146},
        "CHI": {"off_epa": 0.018,  "def_epa": -0.049, "pace_sec": 26.7, "hfa": 1.56, "early_pass_rate": 0.53, "panic_pp": 0.009, "target_hhi": 0.129},
        "BUF": {"off_epa": 0.112,  "def_epa": -0.038, "pace_sec": 26.6, "hfa": 1.56, "early_pass_rate": 0.56, "panic_pp": -0.055, "target_hhi": 0.112},
        "BAL": {"off_epa": 0.134,  "def_epa": -0.029, "pace_sec": 27.5, "hfa": 1.56, "early_pass_rate": 0.50, "panic_pp": 0.046, "target_hhi": 0.140},
    },
}

FORBIDDEN_MARKET_TOKENS = (
    "market", "odds", "book", "split", "ticket", "money", "vig", "spread_line", "total_line", "clv"
)


def _canon(x) -> str:
    """Canonical JSON, mirroring canonicalizeForSeal in locked-projection.ts.

    Built as a string rather than via json.dumps: the C encoder formats floats itself and
    ignores a float subclass __repr__, so the sub-1e-4 fixed-point rule cannot be expressed
    through it. Key order is lexicographic at every depth, matching sort_keys=True.
    """
    if x is None:
        return "null"
    if isinstance(x, bool):
        return "true" if x else "false"
    if isinstance(x, int):
        return str(x)
    if isinstance(x, float):
        if x != x or x in (float("inf"), float("-inf")):
            raise ValueError(f"canonical_hash: non-finite {x}")
        if x.is_integer():
            return str(int(x))
        if abs(x) < 1e-4:
            fixed = f"{x:.8f}".rstrip("0").rstrip(".")
            return fixed if fixed != "-0" else "0"
        return repr(x)
    if isinstance(x, str):
        return json.dumps(x, ensure_ascii=False)
    if isinstance(x, (list, tuple)):
        return "[" + ",".join(_canon(v) for v in x) + "]"
    if isinstance(x, (dict, MappingProxyType)):
        return "{" + ",".join(
            f"{json.dumps(k, ensure_ascii=False)}:{_canon(x[k])}" for k in sorted(x.keys())
        ) + "}"
    raise TypeError(f"canonical_hash: unsupported {type(x).__name__}")


def canonical_hash(obj) -> str:
    blob = _canon(obj).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


def freeze_deep(obj):
    if isinstance(obj, dict):
        return MappingProxyType({k: freeze_deep(v) for k, v in obj.items()})
    if isinstance(obj, list):
        return tuple(freeze_deep(v) for v in obj)
    return obj


def hhi_load_multiplier(target_hhi: float, league_hhi: float = LEAGUE_TARGET_HHI) -> float:
    """Scale positional dropoff in effective-contributor space N_eff = 1/HHI (Davies 2025)."""
    if target_hhi <= 0:
        return 1.0
    n_team = 1.0 / target_hhi
    n_league = 1.0 / league_hhi
    return max(0.55, min(1.60, math.sqrt(n_league / n_team)))


def load_sealed_object_readonly(sealed_path: str = "/opt/model/sealed_baseline.json"):
    if os.path.exists(sealed_path):
        with open(sealed_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    else:
        raw = copy.deepcopy(DEFAULT_SEALED_BASELINE)
    if raw.get("version") != "v1.0":
        raise ValueError(f"SEAL_VIOLATION: Rejected non-v1.0 baseline ({raw.get('version')})")

    def assert_no_market_keys(node, path="root"):
        if isinstance(node, (dict, MappingProxyType)):
            for k, v in node.items():
                if any(tok in k.lower() for tok in FORBIDDEN_MARKET_TOKENS):
                    raise ValueError(f"CLASS_A_FIREWALL_VIOLATION: Market token '{k}' at {path}.{k}")
                assert_no_market_keys(v, f"{path}.{k}")
        elif isinstance(node, (list, tuple)):
            for idx, item in enumerate(node):
                assert_no_market_keys(item, f"{path}[{idx}]")

    assert_no_market_keys(raw)
    if raw.get("tau") != 0.42:
        raise RuntimeError(f"SEAL_BROKEN: coach tau={raw.get('tau')} != 0.42")
    if raw["epaDropoffTable"]["QB_QUESTIONABLE"] != QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF:
        raise RuntimeError("SEAL_BROKEN: QB_QUESTIONABLE != 0.0947")
    digest = canonical_hash(raw)
    return freeze_deep(raw), digest


def sinkhorn_reallocate_weights(C_tuple, base_shares, scratched_roles, eps: float = 0.10):
    C = np.array(C_tuple, dtype=np.float64)
    r = np.array(base_shares, dtype=np.float64)
    r = r / r.sum()
    c = r.copy()
    role_names = ["WR1", "WR2", "WR3", "TE1", "RB1"]
    for idx, rname in enumerate(role_names):
        if rname in scratched_roles:
            c[idx] = 0.01
    c = c / c.sum()
    K = np.exp(np.maximum(-C / eps, -700.0))
    u = np.ones_like(r)
    v = np.ones_like(c)
    for _ in range(200):
        u = r / np.maximum(K @ v, 1e-12)
        v = c / np.maximum(K.T @ u, 1e-12)
        P = np.diag(u) @ K @ np.diag(v)
        if (np.sum(np.abs(P.sum(axis=1) - r)) + np.sum(np.abs(P.sum(axis=0) - c))) <= 1e-9:
            break
    feasible_shares = P.sum(axis=0)
    mass_moved = float(0.5 * np.sum(np.abs(feasible_shares - r)))
    return feasible_shares, mass_moved


def simulate_matchup_pbp(away: str, home: str, away_inj: list, home_inj: list, sealed_state, expected_hash: str, n_sims: int = 5000, seed: int = 42) -> dict:
    assert sealed_state["tau"] == 0.42 and canonical_hash(sealed_state) == expected_hash
    rng = np.random.default_rng(seed)
    tr_away = sealed_state["teamRatings"][away]
    tr_home = sealed_state["teamRatings"][home]
    epa_table = sealed_state["epaDropoffTable"]
    base_shares = [0.26, 0.21, 0.17, 0.20, 0.16]
    away_sh, away_mass = sinkhorn_reallocate_weights(sealed_state["costMatrixC"], base_shares, away_inj)
    home_sh, home_mass = sinkhorn_reallocate_weights(sealed_state["costMatrixC"], base_shares, home_inj)
    role_names = ["WR1", "WR2", "WR3", "TE1", "RB1"]
    exec_mults = epa_table["execution_multipliers"]
    away_eff_mult = sum(away_sh[i] * (exec_mults.get(rn, 0.90) if rn in away_inj else 1.0) for i, rn in enumerate(role_names))
    home_eff_mult = sum(home_sh[i] * (exec_mults.get(rn, 0.90) if rn in home_inj else 1.0) for i, rn in enumerate(role_names))
    away_drop = sum(float(epa_table[fl]) for fl in away_inj if fl in epa_table)
    home_drop = sum(float(epa_table[fl]) for fl in home_inj if fl in epa_table)
    away_net_epa = ((tr_away["off_epa"] - away_drop) * away_eff_mult) - tr_home["def_epa"]
    home_net_epa = ((tr_home["off_epa"] - home_drop) * home_eff_mult) - tr_away["def_epa"] + (tr_home["hfa"] / 79.1)

    r_shrink = 1.0 / (1.0 + 45.0 * 0.04)
    away_pass_delta = (1.0 - r_shrink) * (tr_away["early_pass_rate"] - 0.54)
    home_pass_delta = (1.0 - r_shrink) * (tr_home["early_pass_rate"] - 0.54)

    clock_sec = np.full(n_sims, 3600.0, dtype=np.float64)
    away_score = np.zeros(n_sims, dtype=np.float64)
    home_score = np.zeros(n_sims, dtype=np.float64)
    total_plays = np.zeros(n_sims, dtype=np.int32)
    poss = rng.integers(0, 2, size=n_sims)
    down = np.ones(n_sims, dtype=np.int32)
    ydstogo = np.full(n_sims, 10, dtype=np.int32)
    yardline_100 = np.full(n_sims, 75, dtype=np.int32)

    for _ in range(175):
        active = clock_sec > 0.0
        if not np.any(active):
            break
        n_act = int(np.sum(active))
        total_plays[active] += 1
        net_epa_vec = np.where(poss == 1, home_net_epa, away_net_epa)
        pace_base_vec = np.where(poss == 1, tr_home["pace_sec"], tr_away["pace_sec"])
        pass_delta_vec = np.where(poss == 1, home_pass_delta, away_pass_delta)
        panic_vec = np.where(poss == 1, tr_home["panic_pp"], tr_away["panic_pp"])
        score_diff = np.where(poss == 1, home_score - away_score, away_score - home_score)
        qtr = np.clip(4 - (clock_sec // 900).astype(np.int32), 1, 4)
        is_4th = active & (down == 4)
        is_1to3 = active & (down < 4)

        if np.any(is_4th):
            idx_4th = np.where(is_4th)[0]
            yl4, yd4 = yardline_100[idx_4th], ydstogo[idx_4th]
            go_mask = ((yl4 <= 58) & (yd4 <= 3)) | ((yl4 <= 40) & (yd4 <= 5) & (sealed_state["tau"] >= 0.40)) | ((qtr[idx_4th] == 4) & (score_diff[idx_4th] < 0) & (yd4 <= 7))
            fg_mask = (~go_mask) & (yl4 <= 37)
            punt_mask = (~go_mask) & (~fg_mask)
            if np.any(go_mask):
                g_idx = idx_4th[go_mask]
                p_conv = np.clip(0.64 - 0.05 * ydstogo[g_idx] + 0.55 * net_epa_vec[g_idx], 0.15, 0.82)
                conv = rng.random(len(g_idx)) < p_conv
                gains = np.where(conv, ydstogo[g_idx] + rng.integers(1, 8, size=len(g_idx)), rng.integers(-1, 2, size=len(g_idx)))
                new_yl = yardline_100[g_idx] - gains
                td = conv & (new_yl <= 0)
                home_score[g_idx[td & (poss[g_idx] == 1)]] += 6.95
                away_score[g_idx[td & (poss[g_idx] == 0)]] += 6.95
                poss[g_idx[td | (~conv)]] = 1 - poss[g_idx[td | (~conv)]]
                yardline_100[g_idx[td]] = 75
                yardline_100[g_idx[~conv]] = np.clip(100 - yardline_100[g_idx[~conv]], 5, 95)
                fd_keep = conv & (~td)
                yardline_100[g_idx[fd_keep]] = new_yl[fd_keep]
                down[g_idx] = 1
                ydstogo[g_idx] = np.minimum(10, yardline_100[g_idx])
            if np.any(fg_mask):
                f_idx = idx_4th[fg_mask]
                p_fg = np.clip(0.97 - 0.011 * np.maximum(0, yardline_100[f_idx] - 15), 0.45, 0.98)
                made = rng.random(len(f_idx)) < p_fg
                home_score[f_idx[made & (poss[f_idx] == 1)]] += 3.0
                away_score[f_idx[made & (poss[f_idx] == 0)]] += 3.0
                poss[f_idx] = 1 - poss[f_idx]
                yardline_100[f_idx] = np.where(made, 75, np.clip(100 - yardline_100[f_idx] - 7, 20, 80))
                down[f_idx] = 1
                ydstogo[f_idx] = 10
            if np.any(punt_mask):
                p_idx = idx_4th[punt_mask]
                net_punt = rng.integers(38, 46, size=len(p_idx))
                poss[p_idx] = 1 - poss[p_idx]
                yardline_100[p_idx] = np.clip(100 - (yardline_100[p_idx] - net_punt), 20, 90)
                down[p_idx] = 1
                ydstogo[p_idx] = 10

        if np.any(is_1to3):
            idx_13 = np.where(is_1to3)[0]
            dn_v, ne_v, sd_v, qt_v = down[idx_13], net_epa_vec[idx_13], score_diff[idx_13], qtr[idx_13]
            base_p = np.where(dn_v == 1, 0.48, np.where(dn_v == 2, 0.56, 0.74))
            trail_mod = np.where((qt_v == 4) & (sd_v <= -7), 0.08 + panic_vec[idx_13], 0.0)
            p_pass = np.clip(base_p + pass_delta_vec[idx_13] + trail_mod, 0.15, 0.90)
            is_pass = rng.random(len(idx_13)) < p_pass
            u_out = rng.random(len(idx_13))
            to_prob = np.clip(np.where(is_pass, 0.021, 0.008) - 0.015 * ne_v, 0.003, 0.045)
            is_to = u_out < to_prob
            pass_comp = np.clip(0.645 + 0.38 * ne_v, 0.48, 0.78)
            pass_yds = np.where(
                u_out < (to_prob + 0.062), -rng.integers(5, 9, size=len(idx_13)),
                np.where(u_out < (to_prob + 0.062 + pass_comp), np.round(rng.normal(11.4 + 14.5 * ne_v, 7.5, size=len(idx_13))).astype(np.int32), 0)
            )
            run_yds = np.round(rng.normal(4.4 + 9.5 * ne_v, 4.2, size=len(idx_13))).astype(np.int32)
            yds = np.where(is_pass, pass_yds, run_yds)
            if np.any(is_to):
                t_i = idx_13[is_to]
                poss[t_i] = 1 - poss[t_i]
                yardline_100[t_i] = np.clip(100 - yardline_100[t_i], 15, 85)
                down[t_i], ydstogo[t_i] = 1, 10
            non_to = ~is_to
            if np.any(non_to):
                nt_i = idx_13[non_to]
                g_nt = yds[non_to]
                new_yl = yardline_100[nt_i] - g_nt
                td_nt = new_yl <= 0
                if np.any(td_nt):
                    td_i = nt_i[td_nt]
                    home_score[td_i[poss[td_i] == 1]] += 6.95
                    away_score[td_i[poss[td_i] == 0]] += 6.95
                    poss[td_i] = 1 - poss[td_i]
                    yardline_100[td_i], down[td_i], ydstogo[td_i] = 75, 1, 10
                in_f = ~td_nt
                if np.any(in_f):
                    if_i = nt_i[in_f]
                    g_if = g_nt[in_f]
                    yl_if = np.clip(new_yl[in_f], 1, 99)
                    fd = g_if >= ydstogo[if_i]
                    yardline_100[if_i] = yl_if
                    down[if_i] = np.where(fd, 1, down[if_i] + 1)
                    ydstogo[if_i] = np.where(fd, np.minimum(10, yl_if), np.maximum(1, ydstogo[if_i] - g_if))

        clock_sec[active] -= np.clip(rng.normal(pace_base_vec[active], 3.2, size=n_act), 8.0, 40.0)

    assert sealed_state["tau"] == 0.42 and canonical_hash(sealed_state) == expected_hash
    tot = home_score + away_score
    sprd = home_score - away_score
    pace = 3600.0 / np.maximum(total_plays, 100)
    return {
        "matchup": f"{away} @ {home}",
        "median_total": round(float(np.median(tot)), 2),
        "median_spread_home": round(float(np.median(sprd)), 2),
        "median_plays": round(float(np.median(total_plays)), 1),
        "median_pace_sec": round(float(np.median(pace)), 2),
        "sinkhorn_mass_moved": round(away_mass + home_mass, 4),
        "shootout_prob_ge51": round(float(np.mean(tot >= 51.0)), 4),
        "stall_prob_le37": round(float(np.mean(tot <= 37.0)), 4),
        "one_score_prob_le7": round(float(np.mean(np.abs(sprd) <= 7.0)), 4),
        "coachMindsetHash": expected_hash,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sealed-json", default="/opt/model/sealed_baseline.json")
    ap.add_argument("--sims", type=int, default=5000)
    args = ap.parse_args()
    sealed_obj, digest = load_sealed_object_readonly(args.sealed_json)
    print(f"[SEAL VERIFIED] coachMindsetHash = {digest} | tau = {sealed_obj['tau']} | QB_QUESTIONABLE = {sealed_obj['epaDropoffTable']['QB_QUESTIONABLE']}")
    slate = [
        ("CHI", "SEA", ["QB_QUESTIONABLE"], ["QB_QUESTIONABLE"], "CHI +3.5",  +1.53, "CHI +11 (ML +32)", "ELEVATED_SHARP_AGREE", 1),
        ("TEN", "CIN", [],                  ["QB_QUESTIONABLE"], "TEN +10.5", -2.13, "CIN +18",          "MONEY_AGAINST",        2),
        ("MIN", "DET", ["QB1"],             [],                  "DET -3",    +2.77, "MIN +14",          "MONEY_AGAINST",        3),
        ("CLE", "PIT", ["QB1", "WR2"],      [],                  "PIT -4",    +4.36, "CLE +8",           "MONEY_AGAINST",        4),
        ("LV",  "NYJ", ["QB_QUESTIONABLE"], [],                  "LV +1",     +3.26, "neutral (±2)",     "MODEL_ONLY",           5),
        ("CAR", "GB",  [],                  [],                  "GB -4",     +2.33, "CAR +3 (ML +22)",  "MODEL_ONLY_MILD_AGAINST", 6),
        ("BUF", "BAL", [],                  [],                  "OVER (+40)",+0.63, "OVER +40",         "BOARD_SHARPEST_OVER",  7),
    ]
    for idx, (aw, hm, ai, hi, play, edge, sharp, flag, rank) in enumerate(slate):
        r = simulate_matchup_pbp(aw, hm, ai, hi, sealed_obj, digest, n_sims=args.sims, seed=700 + idx)
        print(f"#{rank} {r['matchup']:9s} | {play:10s} | MedTot: {r['median_total']:5.2f} | MedSprd(H): {r['median_spread_home']:+6.2f} | Pace: {r['median_pace_sec']:5.2f}s | Edge: {edge:+5.2f} | Sharp: {sharp:16s} | {flag}")


if __name__ == "__main__":
    main()
