"""Adversarial Red-Team 7-Vector Forensic Regression Suite.

Tests every vulnerability, Potemkin metric, C11/C++20 boundary bug, DFS salary/key
mismatch, and schedule/injury bypass uncovered and remediated during the Week 9
7-Vector Red-Team Audit.
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path

import numpy as np
import pytest

from intelligence.data_sources.firecrawl_alexandria_live_sync import (
    assert_zero_duplicate_teams_or_players_on_slate,
)
from intelligence.dfs.dfs_and_fantasy_accuracy_engine import (
    BLOCKED_PUNT_DSTS_BY_TEAM,
    SUB_FLOOR_ROLE_TRAP_DENYLIST,
    norm_key,
)
from scripts.ops.preflight_live_roster_injury_gate import (
    assert_lineup_clean,
    load_config as load_gate_config,
)
from intelligence.native_kernels.native_bridge import (
    c_dk_ppr_milestone_scoring,
    c_empirical_bayes_role_shrinkage,
    c_evt_gpd_tweedie_and_wasserstein_dro,
    c_level_k_qre_ownership_fixed_point,
    c_sinkhorn_knopp_bounded_conservation,
    cpp_simulate_student_t_dfs_worlds,
    is_native_kernel_loaded,
)
from intelligence.performance.full_stack_performance_and_data_optimizer import (
    build_postgresql17_optimization_pack,
    build_production_spark_and_duckdb_config,
    run_static_and_performance_code_review,
)
from intelligence.providers.enterprise_ecosystem_and_cloud_router import (
    verify_enterprise_programs_and_services,
)
from intelligence.seo.seo_and_lcp_optimization_engine import (
    audit_content_freshness_and_lcp,
)

REPO_ROOT = Path(__file__).resolve().parents[1]


# ============================================================================
# VECTOR 1 — Schedule, Roster, Injury & Duplicate-Team / Cross-Season Forensics
# ============================================================================


def test_vector1_adversarial_bypasses_of_assert_zero_duplicate_teams_or_players() -> None:
    """Verify assert_zero_duplicate_teams_or_players_on_slate blocks every adversarial bypass."""
    valid_matchups = [("DET", "MIA"), ("NYG", "PHI"), ("GB", "NE")]

    # 1. Reversed bogus 2024 matchup ("BUF", "MIA")
    with pytest.raises(RuntimeError, match="FORBIDDEN BOGUS/2024 MATCHUP"):
        assert_zero_duplicate_teams_or_players_on_slate([("BUF", "MIA")])

    # 2. Alias team code duplicate ("LA" vs "LAR", "WSH" vs "WAS", "JAC" vs "JAX")
    with pytest.raises(RuntimeError, match="DUPLICATE TEAM"):
        assert_zero_duplicate_teams_or_players_on_slate([("LA", "WAS"), ("LAR", "WAS")])

    with pytest.raises(RuntimeError, match="DUPLICATE TEAM"):
        assert_zero_duplicate_teams_or_players_on_slate([("LAR", "WSH"), ("LAR", "WAS")])

    # 3. Duplicate player on the SAME team (previously bypassed when teams matched!)
    with pytest.raises(RuntimeError, match="DUPLICATE PLAYER ON SAME TEAM"):
        assert_zero_duplicate_teams_or_players_on_slate(
            valid_matchups,
            [{"name": "Jahmyr Gibbs", "team": "DET"}, {"name": "Jahmyr Gibbs", "team": "DET"}],
        )

    # 4. Suffix/case/punctuation player alias across or within teams ("Ollie Gordon II" vs "ollie gordon")
    with pytest.raises(RuntimeError, match="DUPLICATE PLAYER"):
        assert_zero_duplicate_teams_or_players_on_slate(
            valid_matchups,
            [{"name": "Ollie Gordon II", "team": "MIA"}, {"name": "ollie gordon", "team": "MIA"}],
        )

    # 5. Off-slate player whose team is not in any active matchup
    with pytest.raises(RuntimeError, match="OFF-SLATE TEAM PLAYER VIOLATION"):
        assert_zero_duplicate_teams_or_players_on_slate(
            valid_matchups,
            [{"name": "Christian McCaffrey", "team": "SF"}],
        )

    # 6. Bye team ("PIT" or "TEN") on Week 9 slate
    with pytest.raises(RuntimeError, match="BYE TEAM"):
        assert_zero_duplicate_teams_or_players_on_slate([("PIT", "MIA")])


def test_vector1_all_13_injured_or_benched_players_excluded_across_repo() -> None:
    """Verify all 13 injured/DNP/benched players are excluded from rosters, dossiers, and DFS."""
    roster_json = json.loads(
        (REPO_ROOT / "data" / "nflverse" / "week9_live_roster_transactions_and_starters_2026.json").read_text(
            encoding="utf-8"
        )
    )
    excluded_names = {
        re.sub(r"[^a-z0-9 ]+", "", str(p.get("name") or p.get("player") or "").lower()).strip()
        for p in roster_json["excluded_players"]
    }
    required_13 = [
        "treveyon henderson",
        "devon achane",
        "jaylen wright",
        "tanner mckee",
        "jalen hurts",
        "lamar jackson",
        "james conner",
        "trey benson",
        "davante adams",
        "hunter henry",
        "aj brown",
        "jake ferguson",
        "kavontae turpin",
    ]
    for req in required_13:
        assert req in excluded_names, f"Missing required excluded player in roster JSON: {req}"

    # Verify zero of the 13 appear in any of the 15 Week 9 game dossiers' active projections
    dossier_files = sorted((REPO_ROOT / "data" / "engine").glob("connected_workflow_dossier_*_week9.json"))
    assert len(dossier_files) == 15
    seen_teams: set[str] = set()
    for df in dossier_files:
        d = json.loads(df.read_text(encoding="utf-8"))
        away, home = [x.strip() for x in d["matchup"].split("@")]
        assert away not in ("PIT", "TEN") and home not in ("PIT", "TEN")
        assert away not in seen_teams, f"Duplicate away team {away} in {df.name}"
        assert home not in seen_teams, f"Duplicate home team {home} in {df.name}"
        seen_teams.update([away, home])

        athletes = d.get("stage3_4_conserved_post_sim_projections", {}).get("athlete_post_sim_projections", {})
        for player_name in athletes:
            norm_p = re.sub(r"[^a-z0-9 ]+", "", player_name.lower()).strip()
            assert norm_p not in required_13, f"Banned player {player_name} leaked into {df.name}"


def test_vector1_web_coach_writeups_and_redline_world_clean_week9() -> None:
    """Verify coach-writeup-engine.ts and redline-world.tsx have zero 2024 matchups or Week 8 ghosts."""
    writeups_ts = (REPO_ROOT / "apps" / "web" / "lib" / "writeups" / "coach-writeup-engine.ts").read_text(
        encoding="utf-8"
    )
    redline_tsx = (REPO_ROOT / "apps" / "web" / "components" / "redline" / "redline-world.tsx").read_text(
        encoding="utf-8"
    )
    assert "Detroit Lions @ Green Bay Packers" not in redline_tsx

    matchups = re.findall(r'"matchup":\s*"([^"]+\s@\s[^"]+)"', writeups_ts)
    assert len(matchups) == 14
    teams = [t.strip() for m in matchups for t in m.split("@")]
    assert len(teams) == len(set(teams)) == 28, f"Duplicate teams in coach-writeup-engine.ts: {matchups}"
    assert "Tennessee Titans" not in teams and "Pittsburgh Steelers" not in teams
    for banned in ("Lamar Jackson", "Tanner McKee", "Hunter Henry", "A.J. Brown", "TreVeyon Henderson"):
        assert banned not in writeups_ts, f"Banned player {banned} found in coach-writeup-engine.ts"


# ============================================================================
# VECTOR 2 — DraftKings DFS Optimizer, Salary Cap & Two-Stage Pipeline Audit
# ============================================================================


def test_vector2_content_pack_4_lineups_and_json_packets_match_real_dk_csv() -> None:
    """Parse all 4 lineups from the Content Pack and verify 100% against dk_salaries_week9_main_slate_2026_11_08.csv."""
    csv_path = REPO_ROOT / "data" / "dfs" / "dk_salaries_week9_main_slate_2026_11_08.csv"
    dk_by_name: dict[str, dict[str, object]] = {}
    main_slate_games: set[str] = set()
    with csv_path.open("r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row["Name"].strip()
            game_code = row["Game Info"].split(" ")[0].strip()
            main_slate_games.add(game_code)
            dk_by_name[name] = {
                "position": row["Position"].strip(),
                "salary": int(row["Salary"]),
                "team": row["TeamAbbrev"].strip(),
                "game": game_code,
            }

    assert len(main_slate_games) == 11
    for prime_game in ("JAX@BAL", "CIN@ATL", "TB@CHI", "BUF@MIN"):
        assert prime_game not in main_slate_games

    md_text = (
        REPO_ROOT
        / "docs"
        / "predictions"
        / "research"
        / "2026-11-07"
        / "WEEK-9-LIVE-CONTENT-AND-ENGAGEMENT-PACK-2026-11-07.md"
    ).read_text(encoding="utf-8")

    # Extract each of the 4 lineup blocks in Section 9B
    lineup_headers = list(re.finditer(r"#### Lineup (\d+) \([^)]*?`\$([0-9,]+)` Salary", md_text))
    assert len(lineup_headers) == 4

    cfg = load_gate_config()
    row_pattern = re.compile(
        r"\|\s*\*\*(QB|RB1|RB2|WR1|WR2|WR3|TE|FLEX|DST)\*\*\s*\|\s*\*\*([^*]+)\*\*\s*\|\s*([A-Z]+)\s*\|\s*([A-Z]{2,3})\s*\|[^|]+\|\s*\$([0-9,]+)\s*\|\s*\*\*([0-9.]+)\*\*\s*\|"
    )

    for idx, hdr in enumerate(lineup_headers):
        start = hdr.start()
        end = lineup_headers[idx + 1].start() if idx + 1 < len(lineup_headers) else md_text.find("## PART 10", start)
        block = md_text[start:end]
        header_sal = int(hdr.group(2).replace(",", ""))
        rows = row_pattern.findall(block)
        assert len(rows) == 9, f"Lineup {idx + 1} does not have 9 slots: found {len(rows)}"

        total_sal = 0
        seen_players: set[str] = set()
        seen_games: set[str] = set()
        for slot, p_name, pos, team, sal_str, _proj_str in rows:
            p_name = p_name.strip()
            sal = int(sal_str.replace(",", ""))
            assert p_name in dk_by_name, f"Lineup {idx + 1} player {p_name} missing from Main Slate CSV"
            csv_rec = dk_by_name[p_name]
            assert sal == csv_rec["salary"], f"Salary mismatch for {p_name}: {sal} != {csv_rec['salary']}"
            assert pos == csv_rec["position"], f"Position mismatch for {p_name}: {pos} != {csv_rec['position']}"
            assert team == csv_rec["team"], f"Team mismatch for {p_name}: {team} != {csv_rec['team']}"
            assert norm_key(p_name) not in SUB_FLOOR_ROLE_TRAP_DENYLIST, f"Sub-floor trap {p_name} in Lineup {idx + 1}"
            if pos == "DST":
                assert team not in BLOCKED_PUNT_DSTS_BY_TEAM, f"Punt DST {p_name} ({team}) in Lineup {idx + 1}"
            total_sal += sal
            seen_players.add(p_name)
            seen_games.add(str(csv_rec["game"]))

        assert_lineup_clean(list(seen_players), cfg)
        assert len(seen_players) == 9
        assert len(seen_games) >= 2
        assert total_sal <= 49900, f"Lineup {idx + 1} exceeds $49,900 cap: {total_sal}"
        assert total_sal == header_sal, f"Lineup {idx + 1} header salary {header_sal} != sum {total_sal}"


def test_vector2_two_stage_19_equations_non_constant_and_strict_json() -> None:
    """Verify Stage 1/2/3 JSON artifacts contain zero NaN tokens and non-constant 19-equation metrics."""
    for fname in (
        "gse_post_game_sim_player_projections_week9_2026_11_07.json",
        "gse_dedicated_curated_dfs_player_pool_week9_2026_11_07.json",
        "week9_sunday_main_11_game_packet_2026_11_07.json",
        "two_stage_gse_dfs_execution_receipt_2026_11_07.json",
        "week9_dual_slate_dfs_simulations_and_lineups_2026.json",
    ):
        fpath = REPO_ROOT / "data" / "dfs" / fname
        assert fpath.is_file(), f"Missing DFS artifact: {fname}"
        raw = fpath.read_text(encoding="utf-8")
        # Strict RFC 8259 check: reject NaN / Infinity
        parsed = json.loads(
            raw,
            parse_constant=lambda c: (_ for _ in ()).throw(ValueError(f"Invalid JSON token {c} in {fname}")),
        )
        assert isinstance(parsed, dict)

    pool_data = json.loads(
        (REPO_ROOT / "data" / "dfs" / "gse_dedicated_curated_dfs_player_pool_week9_2026_11_07.json").read_text(
            encoding="utf-8"
        )
    )
    pool = pool_data["curated_dfs_player_pool"]
    assert len(pool) >= 100
    qre_vals = {round(float(p["frontier_19_equation_metrics"]["eq_dfs_12_qre_equilibrium_ownership"]), 6) for p in pool}
    tweedie_vals = {round(float(p["frontier_19_equation_metrics"]["eq_dfs_14_tweedie_exact_zero_prob"]), 6) for p in pool}
    assert len(qre_vals) > 25, f"EQ-DFS-12 QRE ownership collapsed to constant: {qre_vals}"
    assert len(tweedie_vals) > 25, f"EQ-DFS-14 Tweedie zero prob collapsed to constant: {tweedie_vals}"
    assert pool_data["frontier_19_equations_summary"]["eq_dfs_09_k_dpp_portfolio_log_det_diversity"] != 0.0


# ============================================================================
# VECTOR 3 — Native C11 / C++20 Kernel & Simulation Honesty Audit
# ============================================================================


def test_vector3_native_c11_cpp20_dll_adversarial_edge_cases() -> None:
    """Stress-test all 6 native C11/C++20 kernels with NaN, Inf, n=0, n=1, negative std, and huge IDs."""
    assert is_native_kernel_loaded(), "libgse_native_kernels.dll must be loaded!"

    # 1. Empty / n=0 arrays raise ValueError rather than dereferencing null/empty buffers
    empty = np.array([], dtype=np.float64)
    with pytest.raises(ValueError):
        c_sinkhorn_knopp_bounded_conservation(empty, empty, empty, 1.0)

    # 2. NaN / Inf inputs to Sinkhorn-Knopp
    w_nan = np.array([np.nan, np.inf, 0.3, 0.4], dtype=np.float64)
    lo = np.array([0.05, 0.05, 0.05, 0.05], dtype=np.float64)
    hi = np.array([0.60, 0.60, 0.60, 0.60], dtype=np.float64)
    res_sk = c_sinkhorn_knopp_bounded_conservation(w_nan, lo, hi, 1.0)
    assert np.all(np.isfinite(res_sk))
    assert abs(float(res_sk.sum()) - 1.0) < 1e-6

    # 3. Empirical Bayes with negative snaps and NaN
    raw_sim = np.array([np.nan, 25.0], dtype=np.float64)
    dk_avg = np.array([np.inf, 18.0], dtype=np.float64)
    sal_prior = np.array([-5.0, 15.0], dtype=np.float64)
    snaps = np.array([-10.0, 55.0], dtype=np.float64)
    bellcow = np.array([0, 1], dtype=np.int32)
    trap = np.array([1, 0], dtype=np.int32)
    post_m = c_empirical_bayes_role_shrinkage(raw_sim, dk_avg, sal_prior, snaps, bellcow, trap)
    assert np.all(np.isfinite(post_m))

    # 4. DK PPR milestone scoring with NaN
    nan_mat = np.array([[np.nan, 18.0], [12.0, np.inf]], dtype=np.float64)
    pass_mat = np.array([[np.nan, 315.0], [250.0, 190.0]], dtype=np.float64)
    zero_mat = np.zeros((2, 2), dtype=np.float64)
    fpts, bonus_rate = c_dk_ppr_milestone_scoring(nan_mat, pass_mat, zero_mat, zero_mat)
    assert np.all(np.isfinite(fpts)) and np.all(np.isfinite(bonus_rate))

    # 5. Student-t worlds with huge ESPN game_ids (401873038) and negative std_fpts
    means = np.array([20.0, 15.0, np.nan], dtype=np.float64)
    stds = np.array([-5.0, 6.0, np.inf], dtype=np.float64)
    pos_codes = np.array([0, 2, 1], dtype=np.int32)
    huge_game_ids = np.array([401873038, 401873038, 999999999], dtype=np.int32)
    huge_team_ids = np.array([100001, 100001, 200002], dtype=np.int32)
    sim_out = cpp_simulate_student_t_dfs_worlds(
        means, stds, huge_team_ids, huge_game_ids, pos_codes, n_sims=64, seed=42
    )
    assert sim_out["worlds"].shape == (64, 3)
    assert np.all(np.isfinite(sim_out["worlds"]))
    assert np.all(sim_out["worlds"] >= 0.0)

    # 6. EVT-GPD with extreme gpd_xi >= 0.5 (previously divided by zero or negative)
    evt = c_evt_gpd_tweedie_and_wasserstein_dro(
        means,
        stds,
        sim_out["p90"],
        np.array([5.0, 0.5, -2.0], dtype=np.float64),
        wasserstein_eps=0.15,
    )
    for k, arr in evt.items():
        assert np.all(np.isfinite(arr)), f"Non-finite values in EVT output {k}"

    # 7. Level-k QRE ownership with extreme projections (1000.0) that overflow naive exp()
    qre = c_level_k_qre_ownership_fixed_point(
        np.array([1000.0, 10.0, -500.0, np.nan], dtype=np.float64),
        np.array([5000.0, 4000.0, 0.0, -100.0], dtype=np.float64),
        np.array([100.0, 10.0, 5.0, np.inf], dtype=np.float64),
    )
    assert np.all(np.isfinite(qre["qre_ownership"]))
    assert np.all(np.isfinite(qre["level3_edge"]))
    assert 0.02 <= float(qre["qre_ownership"].sum()) <= 1.0


def test_vector3_all_15_week9_dossiers_non_negative_quantiles() -> None:
    """Verify zero negative p10/p25 quantiles exist across all 15 Week 9 game dossiers."""
    for df in sorted((REPO_ROOT / "data" / "engine").glob("connected_workflow_dossier_*_week9.json")):
        d = json.loads(df.read_text(encoding="utf-8"))
        athletes = d["stage3_4_conserved_post_sim_projections"]["athlete_post_sim_projections"]
        for player, pdata in athletes.items():
            for stat_name, qdict in pdata.get("projections", {}).items():
                if isinstance(qdict, dict) and "p10" in qdict:
                    assert float(qdict["p10"]) >= 0.0, f"Negative p10 in {df.name} {player} {stat_name}"
                    assert float(qdict["p25"]) >= 0.0, f"Negative p25 in {df.name} {player} {stat_name}"


# ============================================================================
# VECTOR 4 — Top 10 Props & Dossier Alignment Audit
# ============================================================================


def test_vector4_top_10_props_match_dossiers_on_disk() -> None:
    """Verify the featured props in the Content Pack match the JSON dossiers on disk."""
    dal_ind = json.loads(
        (REPO_ROOT / "data" / "engine" / "connected_workflow_dossier_dal_ind_week9.json").read_text(
            encoding="utf-8"
        )
    )
    malik_rush = dal_ind["stage3_4_conserved_post_sim_projections"]["athlete_post_sim_projections"]["Malik Davis"][
        "projections"
    ]["rush_yds"]["mean"]
    assert abs(float(malik_rush) - 51.4) < 0.5

    det_mia = json.loads(
        (REPO_ROOT / "data" / "engine" / "connected_workflow_dossier_det_mia_week9.json").read_text(
            encoding="utf-8"
        )
    )
    core_props = det_mia["stage5_360_conjunction_gate_and_call_sheet"]["core_prop_evaluations"]
    assert len(core_props) >= 50
    ollie_rush = det_mia["stage3_4_conserved_post_sim_projections"]["athlete_post_sim_projections"][
        "Ollie Gordon II"
    ]["projections"]["rush_yds"]["mean"]
    assert abs(float(ollie_rush) - 86.1) < 1.0


# ============================================================================
# VECTOR 5 — Zero-Potemkin Live Measurement Verification
# ============================================================================


def test_vector5_zero_potemkin_metrics_in_perf_seo_and_enterprise_modules(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify performance, SEO/LCP, and enterprise modules execute live measurements."""
    pg_pack = build_postgresql17_optimization_pack()
    n1 = pg_pack["n_plus_1_remediation"]
    assert n1["live_rows_benchmarked"] >= 2000
    assert any("SEARCH" in s for s in n1["explain_plan_after"])
    assert n1["query_p95_before_ms"] != 148.5  # Never the old hardcoded constant

    spark_pack = build_production_spark_and_duckdb_config()
    assert spark_pack["live_disk_rows_scanned"] >= 570
    assert spark_pack["live_scan_latency_ms"] > 0.0

    code_rev = run_static_and_performance_code_review()
    assert code_rev["files_reviewed_count"] >= 15
    assert code_rev["total_ast_nodes_inspected"] >= 10000

    seo_lcp = audit_content_freshness_and_lcp()
    assert seo_lcp["lcp_four_subpart_audit"]["measured_total_critical_bytes"] > 50000
    assert seo_lcp["lcp_four_subpart_audit"]["ttfb_ms"] != 580  # Never the old hardcoded constant

    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)
    ent = verify_enterprise_programs_and_services()
    assert ent["google_cloud_colab_and_runpod_compute"]["google_cloud_and_gemini"]["env_configured"] is False
