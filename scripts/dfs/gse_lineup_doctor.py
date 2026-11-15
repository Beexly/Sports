#!/usr/bin/env python3
"""
scripts/dfs/gse_lineup_doctor.py
================================
Crash-Free <1s CLI Lineup Doctor & Late-Swap Optimization Auditor for DraftKings DFS.
Supports Classic (including 2-TE builds, latest-kickoff FLEX) and Showdown formats.

Complies with ADR-0009 and GSE Literature-Backed Equations EQ-DFS-01..07.

Usage:
  python scripts/dfs/gse_lineup_doctor.py --season 2026 --week 10 --slate afternoon --self-test
  python scripts/dfs/gse_lineup_doctor.py --season 2026 --week 10 --slate afternoon --lineup "Drew Lock, Kyren Williams, Kenneth Walker III, Jaxon Smith-Njigba, Cooper Kupp, CeeDee Lamb, George Kittle, Brock Bowers, Seahawks"
"""

from __future__ import annotations

import argparse
import csv
import difflib
import json
import math
import os
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence, Set, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.dfs.dfs_literature_optimization_engine import (
    eq_dfs_01_stack_and_overlap_audit,
    eq_dfs_02_kl_contrarian_leverage,
    eq_dfs_04_bertsimas_sim_gamma_robust_floor,
    eq_dfs_05_stack_covariance_bonus,
    eq_dfs_06_duplication_uniqueness_score,
    eq_dfs_07_late_swap_recourse_value,
    evaluate_lineup_with_7_dfs_equations,
)

DATA_DFS_DIR = REPO_ROOT / "data" / "dfs"
DATA_ENGINE_DIR = REPO_ROOT / "data" / "engine"
DATA_NFLVERSE_DIR = REPO_ROOT / "data" / "nflverse"

COMMON_ALIASES: Dict[str, str] = {
    "cmc": "christian mccaffrey",
    "jsn": "jaxon smith njigba",
    "k9": "kenneth walker",
    "kw3": "kenneth walker",
    "ceedee": "ceedee lamb",
    "amon ra": "amon ra st brown",
    "sun god": "amon ra st brown",
    "mhh": "marvin harrison",
    "marv": "marvin harrison",
    "puka": "puka nacua",
    "kittle": "george kittle",
    "bowers": "brock bowers",
    "purdy": "brock purdy",
    "lock": "drew lock",
    "stafford": "matthew stafford",
    "mendoza": "fernando mendoza",
    "beck": "carson beck",
    "penix": "michael penix",
    "penix jr": "michael penix",
    "st brown": "amon ra st brown",
    "kyren": "kyren williams",
    "kupp": "cooper kupp",
    "deebo": "deebo samuel",
    "jauan": "jauan jennings",
    "kraft": "tucker kraft",
    "burrow": "joe burrow",
    "rodgers": "aaron rodgers",
    "chase": "ja marr chase",
    "jamarr chase": "ja marr chase",
    "higgins": "tee higgins",
    "pickens": "george pickens",
    "harris": "najee harris",
    "warren": "jaylen warren",
    "herbert": "justin herbert",
    "lamar": "lamar jackson",
    "brissett": "jacoby brissett",
    "henry": "derrick henry",
    "flowers": "zay flowers",
    "mcconkey": "ladd mcconkey",
    "dobbins": "j k dobbins",
    "jk dobbins": "j k dobbins",
}

DST_NAME_MAP: Dict[str, str] = {
    "cardinals": "ARI", "falcons": "ATL", "ravens": "BAL", "bills": "BUF",
    "panthers": "CAR", "bears": "CHI", "bengals": "CIN", "browns": "CLE",
    "cowboys": "DAL", "broncos": "DEN", "lions": "DET", "packers": "GB",
    "texans": "HOU", "colts": "IND", "jaguars": "JAX", "chiefs": "KC",
    "chargers": "LAC", "rams": "LAR", "raiders": "LV", "dolphins": "MIA",
    "vikings": "MIN", "patriots": "NE", "saints": "NO", "giants": "NYG",
    "jets": "NYJ", "eagles": "PHI", "steelers": "PIT", "seahawks": "SEA",
    "49ers": "SF", "buccaneers": "TB", "titans": "TEN", "commanders": "WAS",
}


def _norm_name(s: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", str(s).lower())
    words = [
        w for w in cleaned.split()
        if w not in ("jr", "sr", "ii", "iii", "iv", "v", "defense", "dst")
    ]
    return " ".join(words)


class GSELineupDoctor:
    """Sub-second Lineup Doctor auditing Stage-0 eligibility, 2-TE Classic builds, late-swap FLEX, and EQ-DFS-01..07."""

    def __init__(self, season: int = 2026, week: int = 10, slate: str = "afternoon"):
        self.season = season
        self.week = week
        self.slate = slate.lower()
        self.stage0_cfg = self._load_stage0_config()
        self.player_pool, self.pool_by_norm = self._load_slate_pool()

    def _load_stage0_config(self) -> Dict[str, Any]:
        candidates = [
            DATA_ENGINE_DIR / f"week{self.week}_stage0_preflight_config.json",
            DATA_ENGINE_DIR / f"week{self.week}_unified_stage0_truth.json",
            DATA_NFLVERSE_DIR / f"week{self.week}_live_roster_transactions_and_starters_{self.season}.json",
            DATA_NFLVERSE_DIR / f"stage0_truth_s{self.season}_w{self.week}.json",
        ]
        for c in candidates:
            if c.is_file():
                try:
                    return json.loads(c.read_text(encoding="utf-8"))
                except Exception:
                    pass
        return {"week": self.week, "excluded_players": [], "confirmed_qb1": {}}

    def _load_slate_pool(self) -> Tuple[List[Dict[str, Any]], Dict[str, Dict[str, Any]]]:
        pool: List[Dict[str, Any]] = []
        pool_by_norm: Dict[str, Dict[str, Any]] = {}

        # 1. First check if hydrated packet JSON is cached
        packet_files = {
            "afternoon": [
                DATA_DFS_DIR / "week10_afternoon_classic_packet.json",
                DATA_DFS_DIR / "week10_sun_main_classic_packet.json",
            ],
            "main": [
                DATA_DFS_DIR / "week10_sun_main_classic_packet.json",
            ],
            "main_lateswap": [
                DATA_DFS_DIR / "week10_sun_main_classic_packet.json",
            ],
            "snf_showdown": [
                DATA_DFS_DIR / "week10_snf_pit_cin_showdown_packet.json",
            ],
            "mnf_showdown": [
                DATA_DFS_DIR / "week10_mnf_lac_bal_showdown_packet.json",
            ],
        }

        slate_teams: Dict[str, Set[str]] = {
            "afternoon": {"SEA", "LV", "LAR", "ARI", "SF", "DAL"},
            "main": {"BUF", "NYJ", "CAR", "NO", "HOU", "CLE", "JAX", "TEN", "KC", "ATL", "LAR", "ARI", "MIA", "IND", "MIN", "GB", "SEA", "LV", "SF", "DAL"},
            "main_lateswap": {"BUF", "NYJ", "CAR", "NO", "HOU", "CLE", "JAX", "TEN", "KC", "ATL", "LAR", "ARI", "MIA", "IND", "MIN", "GB", "SEA", "LV", "SF", "DAL"},
            "snf_showdown": {"PIT", "CIN"},
            "mnf_showdown": {"LAC", "BAL"},
        }
        target_teams = slate_teams.get(self.slate, set())

        # Load from packet if available
        cands = packet_files.get(self.slate, [])
        for pf in cands:
            if pf.is_file():
                try:
                    pdata = json.loads(pf.read_text(encoding="utf-8"))
                    cand_pool = pdata.get("player_pool") or pdata.get("pool") or []
                    for p in cand_pool:
                        tm = str(p.get("team") or "").upper()
                        if target_teams and tm not in target_teams:
                            continue
                        nm = str(p.get("player") or p.get("name") or "")
                        norm_k = _norm_name(nm)
                        p_rec = {
                            "name": nm,
                            "player": nm,
                            "team": tm,
                            "opponent": str(p.get("opponent") or ""),
                            "position": str(p.get("pos") or p.get("position") or "").upper(),
                            "pos": str(p.get("pos") or p.get("position") or "").upper(),
                            "salary": int(p.get("salary") or 4500),
                            "projection": float(p.get("proj_pts") or p.get("median_fpts") or p.get("projection") or 10.0),
                            "median_fpts": float(p.get("proj_pts") or p.get("median_fpts") or p.get("projection") or 10.0),
                            "p25_floor_fpts": float(p.get("p25_pts") or p.get("p25_floor_fpts") or 4.0),
                            "p90_ceiling_fpts": float(p.get("p90_pts") or p.get("p90_ceiling_fpts") or 22.0),
                            "kickoff_epoch": p.get("kickoff_epoch"),
                        }
                        if norm_k not in pool_by_norm:
                            pool_by_norm[norm_k] = p_rec
                            pool.append(p_rec)
                except Exception:
                    pass

        # 2. Also read salary CSVs to guarantee full player coverage
        salary_csvs = {
            "afternoon": [DATA_DFS_DIR / "week10_sun_main_classic_dk_salaries.csv"],
            "main": [DATA_DFS_DIR / "week10_sun_main_classic_dk_salaries.csv"],
            "main_lateswap": [DATA_DFS_DIR / "week10_sun_main_classic_dk_salaries.csv"],
            "snf_showdown": [DATA_DFS_DIR / "week10_snf_pit_cin_dk_salaries.csv"],
            "mnf_showdown": [DATA_DFS_DIR / "week10_mnf_lac_bal_dk_salaries.csv"],
        }
        for csv_f in salary_csvs.get(self.slate, []):
            if csv_f.is_file():
                try:
                    with csv_f.open("r", encoding="utf-8") as fh:
                        reader = csv.DictReader(fh)
                        for row in reader:
                            tm = str(row.get("team") or "").strip().upper()
                            if target_teams and tm not in target_teams:
                                continue
                            nm = str(row.get("name") or row.get("player") or "").strip()
                            norm_k = _norm_name(nm)
                            if norm_k not in pool_by_norm:
                                sal = int(row.get("salary") or 4500)
                                pos = str(row.get("position") or "").strip().upper()
                                est_proj = max(2.0, round((sal / 1000.0) * 2.8, 2))
                                p_rec = {
                                    "name": nm,
                                    "player": nm,
                                    "team": tm,
                                    "opponent": str(row.get("opponent") or ""),
                                    "position": pos,
                                    "pos": pos,
                                    "salary": sal,
                                    "projection": est_proj,
                                    "median_fpts": est_proj,
                                    "p25_floor_fpts": round(est_proj * 0.45, 2),
                                    "p90_ceiling_fpts": round(est_proj * 2.1, 2),
                                }
                                pool_by_norm[norm_k] = p_rec
                                pool.append(p_rec)
                except Exception:
                    pass

        return pool, pool_by_norm

    def resolve_player(self, input_name: str) -> Optional[Dict[str, Any]]:
        raw = str(input_name).strip()
        if not raw:
            return None
        norm = _norm_name(raw)

        # Check direct normalized match
        if norm in self.pool_by_norm:
            return self.pool_by_norm[norm]

        # Check common aliases
        if norm in COMMON_ALIASES:
            alias_target = COMMON_ALIASES[norm]
            if alias_target in self.pool_by_norm:
                return self.pool_by_norm[alias_target]

        # Check DST team map
        norm_words = norm.split()
        for w in norm_words:
            if w in DST_NAME_MAP:
                dst_tm = DST_NAME_MAP[w]
                # Find DST in pool
                for p in self.player_pool:
                    if p["position"] == "DST" and p["team"] == dst_tm:
                        return p

        # Fuzzy matching against pool keys
        matches = difflib.get_close_matches(norm, list(self.pool_by_norm.keys()), n=1, cutoff=0.58)
        if matches:
            return self.pool_by_norm[matches[0]]

        # Substring search
        for k, rec in self.pool_by_norm.items():
            if norm in k or k in norm:
                return rec

        return None

    def audit_lineup(self, player_names: Sequence[str]) -> Dict[str, Any]:
        """Diagnose a single lineup against Stage-0 eligibility, salary cap, 2-TE, late-swap, and EQ-DFS-01..07."""
        start_t = time.perf_counter()
        resolved_players: List[Dict[str, Any]] = []
        unresolved_names: List[str] = []

        for nm in player_names:
            hit = self.resolve_player(nm)
            if hit:
                resolved_players.append(hit)
            else:
                unresolved_names.append(nm)

        # Stage-0 Inactive / Exclusion Check
        stage0_exclusions = set()
        for ep in self.stage0_cfg.get("excluded_players") or []:
            if isinstance(ep, Mapping):
                stage0_exclusions.add(_norm_name(str(ep.get("name") or "")))
            else:
                stage0_exclusions.add(_norm_name(str(ep)))

        confirmed_qb1 = {
            tm: _norm_name(str(qb))
            for tm, qb in (self.stage0_cfg.get("confirmed_qb1") or {}).items()
        }

        stage0_violations: List[Dict[str, str]] = []
        for p in resolved_players:
            p_norm = _norm_name(p["name"])
            if p_norm in stage0_exclusions:
                stage0_violations.append({
                    "player": p["name"],
                    "team": p["team"],
                    "reason": "Stage-0 blocked (OUT/IR/DNP/Traded)",
                })
            if p["position"] == "QB" and p["team"] in confirmed_qb1:
                if p_norm != confirmed_qb1[p["team"]]:
                    stage0_violations.append({
                        "player": p["name"],
                        "team": p["team"],
                        "reason": f"Non-starter QB (Confirmed QB1 is {self.stage0_cfg['confirmed_qb1'][p['team']]})",
                    })

        total_salary = sum(int(p["salary"]) for p in resolved_players)
        salary_valid = total_salary <= 50000

        # Positional Validation
        is_showdown = len(player_names) == 6 or "showdown" in self.slate
        pos_counts: Dict[str, int] = {"QB": 0, "RB": 0, "WR": 0, "TE": 0, "DST": 0, "K": 0}
        for p in resolved_players:
            pos_counts[p["position"]] = pos_counts.get(p["position"], 0) + 1

        lineup_structure_valid = False
        format_type = "SHOWDOWN" if is_showdown else "CLASSIC"

        if is_showdown:
            lineup_structure_valid = len(resolved_players) == 6 and not unresolved_names
        else:
            # Classic: 1 QB, 2..3 RB, 3..4 WR, 1..2 TE (2-TE UNLOCKED), 1 DST, sum == 9
            qb_ok = pos_counts.get("QB", 0) == 1
            dst_ok = pos_counts.get("DST", 0) == 1
            rb_ok = 2 <= pos_counts.get("RB", 0) <= 3
            wr_ok = 3 <= pos_counts.get("WR", 0) <= 4
            te_ok = 1 <= pos_counts.get("TE", 0) <= 2  # 2-TE build acceptance
            total_skill = pos_counts.get("RB", 0) + pos_counts.get("WR", 0) + pos_counts.get("TE", 0)
            lineup_structure_valid = (
                len(resolved_players) == 9
                and not unresolved_names
                and qb_ok
                and dst_ok
                and rb_ok
                and wr_ok
                and te_ok
                and total_skill == 7
            )

        # Late-swap FLEX audit
        def _window_rank(team_str: str) -> int:
            t = str(team_str or "").upper()
            if t in {"LAC", "BAL"}:
                return 4
            if t in {"PIT", "CIN"}:
                return 3
            if t in {"SEA", "LV", "LAR", "LA", "ARI", "SF", "DAL"}:
                return 2
            return 1

        flex_positioning_audit: Dict[str, Any] = {"status": "NOT_APPLICABLE"}
        if not is_showdown and lineup_structure_valid:
            # Check which position has the extra player
            extra_pos = None
            if pos_counts.get("RB") == 3:
                extra_pos = "RB"
            elif pos_counts.get("WR") == 4:
                extra_pos = "WR"
            elif pos_counts.get("TE") == 2:
                extra_pos = "TE"

            flex_positioning_audit = {
                "format": "Classic",
                "extra_position_flex": extra_pos,
                "is_2te_build": pos_counts.get("TE") == 2,
                "optimal_late_swap_recommendation": f"Ensure latest-kickoff {extra_pos} is placed in FLEX slot to maximize EQ-DFS-07 recourse optionality",
            }

        # 7-Equation Literature Evaluation (EQ-DFS-01..07)
        eq_results: Dict[str, Any] = {}
        if resolved_players:
            eq_results = evaluate_lineup_with_7_dfs_equations(
                resolved_players,
                submodular_marginal_gain=0.0045,
            )

        # Optimal 1-Swap Upgrade Recommendation
        upgrade_recommendation: Optional[Dict[str, Any]] = None
        cap_remaining = 50000 - total_salary
        if cap_remaining >= 100 and resolved_players:
            lowest_val_player = min(
                resolved_players,
                key=lambda p: float(p.get("projection", 10.0)),
            )
            # Search candidate upgrades in same position
            p_pos = lowest_val_player["position"]
            cur_sal = lowest_val_player["salary"]
            cur_proj = lowest_val_player["projection"]
            used_names = {_norm_name(p["name"]) for p in resolved_players}

            candidates = [
                cand for cand in self.player_pool
                if cand["position"] == p_pos
                and _norm_name(cand["name"]) not in used_names
                and _norm_name(cand["name"]) not in stage0_exclusions
                and cand["salary"] > cur_sal
                and cand["salary"] <= cur_sal + cap_remaining
                and cand["projection"] > cur_proj
            ]
            if candidates:
                best_cand = max(candidates, key=lambda c: float(c["projection"]))
                gain = round(best_cand["projection"] - cur_proj, 2)
                upgrade_recommendation = {
                    "swap_out": lowest_val_player["name"],
                    "swap_in": best_cand["name"],
                    "position": p_pos,
                    "cost_increase": best_cand["salary"] - cur_sal,
                    "projected_fpts_gain": gain,
                }

        elapsed_ms = round((time.perf_counter() - start_t) * 1000, 2)
        is_clean = (
            len(stage0_violations) == 0
            and len(unresolved_names) == 0
            and salary_valid
            and lineup_structure_valid
        )

        return {
            "status": "PASS" if is_clean else "FAIL",
            "format": format_type,
            "total_players": len(resolved_players),
            "unresolved_names": unresolved_names,
            "total_salary": total_salary,
            "salary_remaining": 50000 - total_salary,
            "salary_valid": salary_valid,
            "lineup_structure_valid": lineup_structure_valid,
            "is_2te_build": pos_counts.get("TE", 0) == 2,
            "positional_breakdown": pos_counts,
            "stage0_violations": stage0_violations,
            "flex_audit": flex_positioning_audit,
            "upgrade_recommendation": upgrade_recommendation,
            "literature_equations": eq_results,
            "elapsed_ms": elapsed_ms,
        }

    def run_self_test(self) -> bool:
        """Run strict regression test: <= 1.0s runtime, 2-TE Classic acceptance, invalid player diagnosis."""
        t0 = time.perf_counter()
        print("\n" + "=" * 70)
        print("  GSE LINEUP DOCTOR SELF-TEST (ADR-0009 / <1s Runtime Engine)")
        print("=" * 70)

        # Test Case 1: Valid 2-TE Classic Lineup (dynamically built from live Stage-0 active pool)
        print("\n[TEST 1] Verifying 2-TE Classic Lineup Acceptance...")
        ex_norms = {
            _norm_name(str(ep.get("name") if isinstance(ep, Mapping) else ep))
            for ep in (self.stage0_cfg.get("excluded_players") or [])
        }
        conf_qb1 = {
            tm: _norm_name(str(qb))
            for tm, qb in (self.stage0_cfg.get("confirmed_qb1") or {}).items()
        }
        eligible_pool = [
            p for p in self.player_pool
            if _norm_name(p["name"]) not in ex_norms
            and (p["position"] != "QB" or p["team"] not in conf_qb1 or _norm_name(p["name"]) == conf_qb1[p["team"]])
        ]
        by_pos_clean: Dict[str, List[Dict[str, Any]]] = {"QB": [], "RB": [], "WR": [], "TE": [], "DST": []}
        for p in sorted(eligible_pool, key=lambda x: (int(x["salary"]), -float(x["projection"]))):
            if p["position"] in by_pos_clean:
                by_pos_clean[p["position"]].append(p)
        test1_picks = (
            by_pos_clean["QB"][:1]
            + by_pos_clean["RB"][:2]
            + by_pos_clean["WR"][:3]
            + by_pos_clean["TE"][:2]
            + by_pos_clean["DST"][:1]
        )
        test1_players = [p["name"] for p in test1_picks] if len(test1_picks) == 9 else [
            "Drew Lock", "Zach Charbonnet", "Ashton Jeanty",
            "Jaxon Smith-Njigba", "Demarcus Robinson", "Ricky White III",
            "George Kittle", "AJ Barner", "Raiders",
        ]
        res1 = self.audit_lineup(test1_players)
        print(f"  Result: status={res1['status']} | is_2te_build={res1['is_2te_build']} | salary={res1['total_salary']} | elapsed={res1['elapsed_ms']}ms")
        assert res1["status"] == "PASS", f"2-TE build should pass audit: {res1}"
        assert res1["is_2te_build"] is True, "Failed to identify 2-TE build!"
        assert res1["lineup_structure_valid"] is True, "2-TE build must be accepted as valid Classic structure!"

        # Test Case 2: Stage-0 Invalid / Excluded Player Diagnosis
        print("\n[TEST 2] Verifying Stage-0 Excluded / Out Player Diagnosis...")
        test2_players = [
            "Deshaun Watson",  # OUT / Banned
            "Kyren Williams",
            "Zach Charbonnet",
            "Brandon Aiyuk",   # IR / Excluded
            "Jaxon Smith-Njigba",
            "Puka Nacua",
            "George Kittle",
            "Seahawks",
        ]
        res2 = self.audit_lineup(test2_players)
        print(f"  Result: status={res2['status']} | violations={len(res2['stage0_violations'])} | elapsed={res2['elapsed_ms']}ms")
        assert res2["status"] == "FAIL", "Lineup with Stage-0 excluded players must fail!"
        assert len(res2["stage0_violations"]) >= 1, "Must diagnose excluded players!"

        # Test Case 3: Fuzzy / Alias Player Name Resolution
        print("\n[TEST 3] Verifying Zero KeyError Crashes on Fuzzy Names & Aliases...")
        test3_players = [
            "cmc",
            "jsn",
            "purdy",
            "kittle",
            "bowers",
            "ceedee",
            "puka",
            "49ers",
            "charbonnet",
        ]
        res3 = self.audit_lineup(test3_players)
        print(f"  Result: resolved={res3['total_players']}/9 | unresolved={res3['unresolved_names']} | elapsed={res3['elapsed_ms']}ms")
        assert len(res3["unresolved_names"]) == 0, f"Aliases should resolve cleanly: {res3['unresolved_names']}"

        total_time = time.perf_counter() - t0
        print(f"\n[SELF-TEST COMPLETE] Wall-clock time: {round(total_time, 3)}s (Target <= 1.0s)")
        assert total_time <= 1.0, f"Lineup Doctor took {total_time:.3f}s; exceeded strict 1.0s threshold!"
        print("  ALL TESTS PASSED WITH ZERO CRASHES!\n" + "=" * 70)
        return True


def main() -> None:
    parser = argparse.ArgumentParser(description="GSE Crash-Free <1s Lineup Doctor (ADR-0009)")
    parser.add_argument("--season", type=int, default=2026, help="NFL season (default: 2026)")
    parser.add_argument("--week", type=int, default=10, help="NFL week (default: 10)")
    parser.add_argument("--slate", type=str, default="afternoon", choices=["afternoon", "main", "main_lateswap", "snf_showdown", "mnf_showdown"], help="Slate key")
    parser.add_argument("--lineup", type=str, default=None, help="Comma-separated player names")
    parser.add_argument("--self-test", action="store_true", help="Run crash-free regression self-test")

    args = parser.parse_args()

    doc = GSELineupDoctor(season=args.season, week=args.week, slate=args.slate)

    if args.self_test:
        doc.run_self_test()
        return

    if args.lineup:
        players = [p.strip() for p in args.lineup.split(",") if p.strip()]
        report = doc.audit_lineup(players)
        print(json.dumps(report, indent=2))
    else:
        print(f"GSE Lineup Doctor initialized for Week {args.week} ({args.slate}). Use --lineup 'p1,p2,...' or --self-test.")


if __name__ == "__main__":
    main()
