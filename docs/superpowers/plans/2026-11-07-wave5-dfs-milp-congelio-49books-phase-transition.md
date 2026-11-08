# Wave 5: Two-Stage DFS Projection + Robust MILP Optimizer, Bradley Congelio NFL Suite, 49 Google Drive Books, LLM/CV & Universal Phase-Transition Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify the end-to-end Wave 5 ecosystem engine integrating the 23 DFS/Fantasy/Congelio/LLM/OpenCV repositories, the two-stage Projection + Robust MILP Knapsack Optimizer (`Maths Project.pdf` & YouTube MILP formulation), the 49 newly added Google Drive NFL/Fantasy/Prediction books, and the Universal Phase-Transition / Sheaf Cohomology & Immortal Control Plane bridge from the parallel session screenshot.

**Architecture:** Five cohesive, zero-collision Python modules under `intelligence/ecosystem/` and `intelligence/dfs/` with deterministic JSON audit receipts in `data/audits/` and dated research docs in `docs/dfs/research/2026-11-07/` and `docs/engine/research/2026-11-07/`. Each task pairs Pass-1 source/equation extraction with Pass-2 hardware-aware vectorized replacements tuned for Garrett's Windows 11 Intel i7-1255U (`32 GB RAM`, integrated Iris Xe GPU, `~6.3–6.6 GB` free on `C:\`).

**Tech Stack:** Python 3.13, NumPy, SciPy (`scipy.optimize.milp` / HiGHS), Statsmodels, SQLite3 FTS5, Ruff `0.17.4`, Pytest `9.1.1`.

**Spec:** `docs/dfs/research/2026-11-07/WAVE5-DFS-CONGELIO-49BOOKS-SPEC.md` (and `AGENTS.md` Standing Doctrines).

## Global Constraints

- **Zero Collision with Concurrent AGY Session:** Never modify `.ua/*`, `apps/web/lib/seo/ai-agent-and-search-seo.ts`, `intelligence/reasoning/live_cognitive_self_improvement_engine.py`, `tests/test_week9_forensic_autopsy_fixes.py`, or `workers/stealth-skeleton-provider/*`.
- **Disk Footprint Ceiling (`C:\` Drive):** Maintain `0 MB` leftover clone cache (`gh api` inspection + immediate cleanup) to protect the `~6.3–6.6 GB` free space on `C:\`.
- **Standing Ledger & Copy Guardrail (`AGENTS.md` 2026-11-06 — HARD):** Never cite the voided `62-23-1` batch (`72.9%`, `+26.50u`) or `31-11`/`14-6` as a standing record; enforce the superseding verified baseline (`47-19-1` `+24.92u` / Base `38-13-1` `+22.85u` and `86.12/100` benchmark), never render confidence as a `%` on customer-facing surfaces (always `86/100`), and never leak internal math jargon (`tau_hat`, `Romano CQR`, `Sinkhorn`, `Cholesky`, `JEV`) to public UI copy.
- **2026 Week 9 Bye & Injury Denylist Gate:** `PIT` and `TEN` (Week 9 bye) and all `Out`/`IR`/`DNP`/benched players (`De'Von Achane`, `TreVeyon Henderson`, `Jaylen Wright`, `Tanner McKee`, `Jalen Hurts`, `Lamar Jackson`, `James Conner`, `Trey Benson`, `Davante Adams`, `Hunter Henry`, `A.J. Brown`, `Jake Ferguson`, `KaVontae Turpin`) must be hard-blocked before any projection or MILP knapsack solve.
- **Two-Pass Mandate:** Every task must execute Pass 1 (direct source-code/equation implementation) and Pass 2 (introspective critical review + concrete replacement for any deferred or hardware-constrained component).

## Review Focus

1. **Infeasible or Degenerate MILP Knapsack Constraints (Salary Cap `< $50,000` or Locked Injured/Bye Player):** When a caller passes a player from `PIT`/`TEN` or an `Out` player, or sets `uncertainty_budget_gamma < 0`, the solver must raise a deterministic `ValueError` or prune the ineligible player before building the incidence matrix rather than returning a 0-player lineup or silently exceeding `$50,000`.
2. **Collinear or Zero-Variance Historical Samples in the Stage-1 Bayesian/Variance Projection Engine:** When a player has `player_gp == 1` or constant snap counts across weeks, variance estimation must shrink toward the positional empirical Bayes prior (`sigma_pos_prior > 0`) rather than yielding `sigma = 0.0` or `NaN` in the Stage-2 robust ellipsoidal penalty.
3. **Multi-Lineup Exposure & Diversity Overlap Collapse (`pydfs-lineup-optimizer` / `swanson/degenerate`):** Generating $K$ lineups without an iterative overlap cut $\sum_{i \in L_m} x_i \le 9 - d_{\min}$ returns $K$ identical copies of Lineup 1; Task 1 pins strict uniqueness and `max_exposure` enforcement across generated lineups.
4. **Google Drive 49-Book Discovery Across Local Mounts, OneDrive, Downloads & Manifests:** If `G:\My Drive` is unmounted or synced under a secondary path (`C:\Users\Garrett\Google Drive`, `C:\Users\Garrett\OneDrive\Documents`, `C:\Users\Garrett\Downloads`, or repo book registries), the ingestion scanner must deduplicate by SHA-256 / normalized title, index all 49 books without crashing on broken symlinks or locked `.docx`/`.pdf` handles, and wire their extracted equations into the cognitive router registry.
5. **Phase-Transition Spectral Entropy Blindness (`S_spec = 4.1589` on Opposed-Half Cancellation):** Standard spectral entropy cannot distinguish a locked 4-quarter game script from two opposed halves that cancel in the aggregate; Task 4 pins the Cellular Sheaf Cohomology Laplacian $L_{\mathcal{F}} = \delta^T \delta$, Ollivier-Ricci curvature $\kappa_{OR}(e)$, and Phase Resultant $R \in [0, 1]$ (`r_controls()`) to separate coherent phase lock ($R \to 1.0$) from opposed-half cancellation ($R \to 0.0$).

---

### Task 1: Two-Stage DFS Projection Engine + Robust MILP Knapsack Optimizer (13 DFS Repos + `Maths Project.pdf` + YouTube MILP Spec)

**Files:**
- Create: `intelligence/ecosystem/wave5_dfs_milp_and_robust_knapsack_engine.py`
- Test: `tests/test_wave5_dfs_milp_and_robust_knapsack_engine.py`

**Interfaces:**
- Consumes: `data/dfs/dk_salaries_week9_main_slate_2026_11_08.csv`, `intelligence/data_sources/firecrawl_alexandria_live_sync.py:assert_zero_duplicate_teams_or_players_on_slate`
- Produces:
  - `Stage1BayesianVarianceProjectionEngine.predict_player_distributions(players: list[dict[str, Any]], prior_strength: float = 4.0) -> list[dict[str, Any]]`
  - `Stage2RobustMilpKnapsackOptimizer.solve_dk_classic_lineups(projections: list[dict[str, Any]], num_lineups: int = 4, salary_cap: int = 50000, min_unique_players: int = 3, max_exposure: float = 0.75, uncertainty_budget_gamma: float = 1.5) -> list[dict[str, Any]]`
  - `UnderdogAndPropPickemEvEngine.evaluate_pickem_slip(legs: list[dict[str, Any]], correlation_matrix: list[list[float]]) -> dict[str, Any]`

- [ ] **Step 1: Write the failing test in `tests/test_wave5_dfs_milp_and_robust_knapsack_engine.py`**

```python
from __future__ import annotations

import pytest
from intelligence.ecosystem.wave5_dfs_milp_and_robust_knapsack_engine import (
    Stage1BayesianVarianceProjectionEngine,
    Stage2RobustMilpKnapsackOptimizer,
    UnderdogAndPropPickemEvEngine,
)


def test_stage1_bayesian_variance_projection_handles_single_game_and_blocks_bye_or_out() -> None:
    raw_players = [
        {"name": "Jaxon Smith-Njigba", "team": "SEA", "opp": "WAS", "pos": "WR", "salary": 6800, "weekly_fpts": [18.4], "status": "Active"},
        {"name": "De'Von Achane", "team": "MIA", "opp": "BUF", "pos": "RB", "salary": 7600, "weekly_fpts": [24.0, 21.0], "status": "Out"},
        {"name": "George Pickens", "team": "PIT", "opp": "BYE", "pos": "WR", "salary": 6500, "weekly_fpts": [16.0, 19.0], "status": "Active"},
    ]
    out = Stage1BayesianVarianceProjectionEngine.predict_player_distributions(raw_players, prior_strength=4.0)
    assert len(out) == 1
    assert out[0]["name"] == "Jaxon Smith-Njigba"
    assert out[0]["sigma_fpts"] > 0.0
    assert out[0]["floor_10_fpts"] < out[0]["mu_fpts"] < out[0]["ceiling_90_fpts"]


def test_stage2_robust_milp_knapsack_enforces_dk_rules_uniqueness_and_exposure() -> None:
    pool = Stage2RobustMilpKnapsackOptimizer.load_verified_week9_pool()
    lineups = Stage2RobustMilpKnapsackOptimizer.solve_dk_classic_lineups(
        pool,
        num_lineups=3,
        salary_cap=50000,
        min_unique_players=3,
        max_exposure=0.67,
        uncertainty_budget_gamma=1.25,
    )
    assert len(lineups) == 3
    for lu in lineups:
        assert lu["total_salary"] <= 50000
        assert len(lu["roster"]) == 9
        assert lu["robust_objective_score"] <= lu["nominal_projected_fpts"]
    # Verify pairwise uniqueness >= 3 players
    for i in range(len(lineups)):
        for j in range(i + 1, len(lineups)):
            overlap = set(p["name"] for p in lineups[i]["roster"]) & set(p["name"] for p in lineups[j]["roster"])
            assert len(overlap) <= 6

    with pytest.raises(ValueError, match="uncertainty_budget_gamma"):
        Stage2RobustMilpKnapsackOptimizer.solve_dk_classic_lineups(pool, uncertainty_budget_gamma=-0.5)


def test_underdog_and_prop_pickem_ev_engine_computes_correlated_breakeven() -> None:
    legs = [
        {"player": "Jayden Daniels", "stat": "pass_yds", "prob_over": 0.59},
        {"player": "Terry McLaurin", "stat": "rec_yds", "prob_over": 0.58},
        {"player": "Jaxon Smith-Njigba", "stat": "rec_yds", "prob_over": 0.61},
    ]
    corr = [[1.0, 0.42, 0.18], [0.42, 1.0, 0.18], [0.18, 0.18, 1.0]]
    res = UnderdogAndPropPickemEvEngine.evaluate_pickem_slip(legs, corr)
    assert res["correlated_hit_prob"] > res["independent_hit_prob"]
    assert res["payout_multiplier"] == 6.0
    assert res["ev_roi"] > 0.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_wave5_dfs_milp_and_robust_knapsack_engine.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'intelligence.ecosystem.wave5_dfs_milp_and_robust_knapsack_engine'`

- [ ] **Step 3: Implement `intelligence/ecosystem/wave5_dfs_milp_and_robust_knapsack_engine.py`**

Implement:
1. `Stage1BayesianVarianceProjectionEngine`: Normal-Inverse-Gamma conjugate empirical Bayes shrinkage of per-player weekly fantasy points toward positional priors (`QB`, `RB`, `WR`, `TE`, `DST`) with `player_gp` denominator (never team GP), filtering out Week 9 bye teams (`PIT`, `TEN`) and the 13 denylisted `Out`/`IR`/`DNP`/benched players (`bentroutman/dfs-prop-modeling`, `papagorgio23/FantasyFootball`).
2. `Stage2RobustMilpKnapsackOptimizer`: Exact Bertsimas-Sim (`drmbeledogu/RobustDFS`, `dtravers.com/research & projects/Maths Project.pdf`, `youtube.com/watch?v=-mp5w3zSAiE&t=6`) and MILP Knapsack formulation (`DimaKudosh/pydfs-lineup-optimizer`, `jnederlo/dfs_optimizers`, `dfs-with-r/coach`, `chanzer0/NFL-DFS-Tools`, `swanson/degenerate`, `nickdemarinis7/dfs-optimizer`, `n-roth12/DFSLineupOptimizer`, `ashhhlynn/custom-fantasy-optimizer`, `mattbrondum/Fantasy-Football-Optimization`) solved via `scipy.optimize.milp` (`LinearConstraint`, `integrality=1`):
   $$\max_{x \in \{0,1\}^N} \sum_{i=1}^N \mu_i x_i - \Gamma \sqrt{\sum_{i=1}^N \sigma_i^2 x_i} \quad \text{s.t.} \quad \sum_{i=1}^N s_i x_i \le 50000, \quad \text{DK Classic } (1\text{ QB}, 2\text{ RB}, 3\text{ WR}, 1\text{ TE}, 1\text{ FLEX}, 1\text{ DST}), \quad \text{QB+WR/TE stack} \ge 1, \quad \sum_{i \in L_m} x_i \le 9 - d_{\min}.$$
3. `UnderdogAndPropPickemEvEngine`: Gaussian copula joint hit probability & Underdog 3-leg (`6.0x`) / 5-leg (`20.0x`) EV calculator (`api-evangelist/underdog-fantasy`).

- [ ] **Step 4: Run test and Ruff to verify they pass**

Run: `python -m pytest tests/test_wave5_dfs_milp_and_robust_knapsack_engine.py -v && python -m ruff check intelligence/ecosystem/wave5_dfs_milp_and_robust_knapsack_engine.py tests/test_wave5_dfs_milp_and_robust_knapsack_engine.py`
Expected: `3 passed` and `All checks passed!`

- [ ] **Step 5: Commit**

```bash
git add intelligence/ecosystem/wave5_dfs_milp_and_robust_knapsack_engine.py tests/test_wave5_dfs_milp_and_robust_knapsack_engine.py
git commit -m "feat(dfs): add two-stage Bayesian projection and Bertsimas-Sim robust MILP knapsack engine"
```

---

### Task 2: Bradley Congelio (`bcongelio`) 7-Repo NFL Analytics Suite + `Shubhamsaboo/awesome-llm-apps` & `opencv/opencv` Biomechanical Vision Engine

**Files:**
- Create: `intelligence/ecosystem/congelio_nfl_and_opencv_biomechanics_engine.py`
- Test: `tests/test_congelio_nfl_and_opencv_biomechanics_engine.py`

**Interfaces:**
- Consumes: `Stage1BayesianVarianceProjectionEngine` distributions from Task 1
- Produces:
  - `CongelioNflAnalyticsSuite.compute_wp_epa_cpoe_and_fourth_down_bot(down: int, ydstogo: int, yardline_100: int, score_diff: int, seconds_remaining: int, air_yards: float, completed: bool) -> dict[str, Any]`
  - `CongelioNflAnalyticsSuite.audit_observer_reporting_bias_and_attention(reported_shares: list[float], actual_snap_shares: list[float], sequence_embeddings: list[list[float]]) -> dict[str, Any]`
  - `OpenCvAndLlmAppsBiomechanicsEngine.compute_lucas_kanade_kinematic_asymmetry_and_kalman_pose(left_joint_xy: list[tuple[float, float]], right_joint_xy: list[tuple[float, float]], dt_sec: float = 0.0333) -> dict[str, Any]`

- [ ] **Step 1: Write the failing test in `tests/test_congelio_nfl_and_opencv_biomechanics_engine.py`**

```python
from __future__ import annotations

from intelligence.ecosystem.congelio_nfl_and_opencv_biomechanics_engine import (
    CongelioNflAnalyticsSuite,
    OpenCvAndLlmAppsBiomechanicsEngine,
)


def test_congelio_wp_epa_cpoe_fourth_down_and_chatbot_guardrail() -> None:
    res = CongelioNflAnalyticsSuite.compute_wp_epa_cpoe_and_fourth_down_bot(
        down=4,
        ydstogo=2,
        yardline_100=42,
        score_diff=-3,
        seconds_remaining=920,
        air_yards=11.5,
        completed=True,
    )
    assert 0.0 < res["win_probability"] < 1.0
    assert res["cpoe"] > 0.0
    assert res["fourth_down_recommendation"] in {"GO_FOR_IT", "FIELD_GOAL", "PUNT"}
    assert res["fourth_down_go_wp_delta"] > 0.0


def test_congelio_basstrakk_bias_correction_and_self_attention_weights() -> None:
    reported = [0.35, 0.40, 0.30, 0.45]
    actual = [0.22, 0.25, 0.20, 0.28]
    seq = [[1.0, 0.2, 0.5], [0.9, 0.3, 0.4], [0.1, 0.9, 0.8]]
    bias_res = CongelioNflAnalyticsSuite.audit_observer_reporting_bias_and_attention(reported, actual, seq)
    assert bias_res["mean_reporting_inflation_bias"] > 0.10
    assert abs(sum(bias_res["last_step_attention_weights"]) - 1.0) < 1e-6


def test_opencv_biomechanical_kinematic_asymmetry_and_kalman_pose() -> None:
    left_xy = [(0.0, 0.0), (0.45, 0.10), (0.92, 0.18), (1.40, 0.22)]
    right_xy = [(0.0, 0.0), (0.36, 0.08), (0.71, 0.14), (1.05, 0.17)]
    cv_res = OpenCvAndLlmAppsBiomechanicsEngine.compute_lucas_kanade_kinematic_asymmetry_and_kalman_pose(
        left_xy, right_xy, dt_sec=0.0333
    )
    assert cv_res["stride_velocity_asymmetry_pct"] > 10.0
    assert cv_res["soft_tissue_elevated_risk"] is True
    assert len(cv_res["kalman_smoothed_left_xy"]) == 4
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_congelio_nfl_and_opencv_biomechanics_engine.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Implement `intelligence/ecosystem/congelio_nfl_and_opencv_biomechanics_engine.py`**

Implement:
1. `CongelioNflAnalyticsSuite`:
   - `nfl-analytics-with-r-book`, `nfl_scripts`, & `temple_sport_analytics`: Expected Points $EP(d, y, x_{100})$, Win Probability logistic state model, Completion Probability Over Expected ($CPOE = \mathbb{I}(\text{comp}) - \hat{p}_{\text{comp}}(x_{\text{air}}, \text{ydstogo})$), and 4th-down decision bot ($\Delta WP = WP_{\text{go}} - \max(WP_{\text{fg}}, WP_{\text{punt}})$).
   - `basstrakk_bias_analysis`: Self-reported coach-speak / beat-report inflation bias estimator ($\hat{\beta}_{\text{bias}} = \frac{1}{T}\sum (r_t - y_t)$) with empirical Bayes de-biasing.
   - `basstrakk_transformer_model`: Scaled dot-product self-attention $\text{Attention}(Q,K,V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$ over sequential play-calling drives.
   - `nfl_chat_bot_study` & `nfl_alt_logos`: Hallucination & banned-jargon verifier + canonical 32-team color/logo accessibility contrast map.
2. `OpenCvAndLlmAppsBiomechanicsEngine`:
   - `opencv/opencv`: Vectorized NumPy kinematic optical-flow velocity tracker, bilateral stride-velocity asymmetry percentage $\frac{|v_L - v_R|}{\max(v_L, v_R)} \times 100$, and linear Kalman pose smoother for GSI return-to-play and NFL Next Gen Stats tracking.
   - `Shubhamsaboo/awesome-llm-apps`: Multi-agent RAG critique-and-revise router with deterministic citation verification.

- [ ] **Step 4: Run test and Ruff to verify they pass**

Run: `python -m pytest tests/test_congelio_nfl_and_opencv_biomechanics_engine.py -v && python -m ruff check intelligence/ecosystem/congelio_nfl_and_opencv_biomechanics_engine.py tests/test_congelio_nfl_and_opencv_biomechanics_engine.py`
Expected: `3 passed` and `All checks passed!`

- [ ] **Step 5: Commit**

```bash
git add intelligence/ecosystem/congelio_nfl_and_opencv_biomechanics_engine.py tests/test_congelio_nfl_and_opencv_biomechanics_engine.py
git commit -m "feat(analytics): wire Congelio 7-repo NFL suite, OpenCV biomechanics, and LLM-apps router"
```

---

### Task 3: Discovery, Ingestion & Cognitive-Router Wiring of All 49 Google Drive NFL / Fantasy / Prediction Books

**Files:**
- Create: `intelligence/ecosystem/google_drive_49_books_ingestion_and_wiring_engine.py`
- Create: `data/mind/feeds/google_drive_49_books_wired_equations_2026_11_07.jsonl`
- Test: `tests/test_google_drive_49_books_ingestion_and_wiring_engine.py`

**Interfaces:**
- Consumes: Local Google Drive mounts (`G:\My Drive`, `C:\Users\Garrett\Google Drive`, `C:\Users\Garrett\OneDrive\Documents\Galaxy Sports Edge`, `C:\Users\Garrett\Downloads`, and repo corpus manifests `data/mind/` / `docs/`)
- Produces:
  - `GoogleDrive49BooksWiringEngine.discover_and_inventory_49_books(extra_search_dirs: list[Path] | None = None) -> dict[str, Any]`
  - `GoogleDrive49BooksWiringEngine.extract_and_wire_49_book_equations() -> dict[str, Any]`

- [ ] **Step 1: Write the failing test in `tests/test_google_drive_49_books_ingestion_and_wiring_engine.py`**

```python
from __future__ import annotations

from pathlib import Path
from intelligence.ecosystem.google_drive_49_books_ingestion_and_wiring_engine import (
    GoogleDrive49BooksWiringEngine,
)


def test_49_books_inventory_and_equation_wiring_completeness() -> None:
    inv = GoogleDrive49BooksWiringEngine.discover_and_inventory_49_books()
    assert inv["total_books_wired"] == 49
    assert len(inv["books"]) == 49
    for b in inv["books"]:
        assert b["book_id"].startswith("BK-GDRIVE-")
        assert len(b["wired_equations"]) >= 2
        assert b["situational_family"] in {
            "pressure",
            "weather",
            "restFatigue",
            "coveragePersonnel",
            "qbSkillScript",
            "marketMicrostructure",
        }


def test_49_books_cognitive_router_context_adjustment_respects_cap(tmp_path: Path) -> None:
    res = GoogleDrive49BooksWiringEngine.extract_and_wire_49_book_equations(
        output_jsonl=tmp_path / "books_49.jsonl"
    )
    assert res["books_count"] == 49
    assert res["total_equations_wired"] >= 98
    assert abs(res["sample_shrinkage_capped_delta_log_odds"]) <= 0.35
    assert (tmp_path / "books_49.jsonl").exists()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_google_drive_49_books_ingestion_and_wiring_engine.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Implement `intelligence/ecosystem/google_drive_49_books_ingestion_and_wiring_engine.py`**

Scan all local Google Drive / OneDrive / Downloads / corpus directories (`G:\My Drive`, `C:\Users\Garrett\Google Drive`, `C:\Users\Garrett\OneDrive\Documents\Galaxy Sports Edge`, `C:\Users\Garrett\Downloads`, `C:\Users\Garrett\Sports\docs`, `C:\Users\Garrett\Sports\data`), map all 49 NFL / Fantasy Football / Prediction / Quantitative Modeling books (`BK-GDRIVE-01` .. `BK-GDRIVE-49`) with SHA-256 provenance, assign each book's extracted equations to the 6 GSE situational families (`pressure`, `weather`, `restFatigue`, `coveragePersonnel`, `qbSkillScript`, `marketMicrostructure`) + Positive-Part James-Stein shrinkage capped at $|\Delta \text{log-odds}| \le 0.35$, and emit trainer-ready JSONL to `data/mind/feeds/google_drive_49_books_wired_equations_2026_11_07.jsonl`.

- [ ] **Step 4: Run test and Ruff to verify they pass**

Run: `python -m pytest tests/test_google_drive_49_books_ingestion_and_wiring_engine.py -v && python -m ruff check intelligence/ecosystem/google_drive_49_books_ingestion_and_wiring_engine.py tests/test_google_drive_49_books_ingestion_and_wiring_engine.py`
Expected: `2 passed` and `All checks passed!`

- [ ] **Step 5: Commit**

```bash
git add intelligence/ecosystem/google_drive_49_books_ingestion_and_wiring_engine.py tests/test_google_drive_49_books_ingestion_and_wiring_engine.py data/mind/feeds/google_drive_49_books_wired_equations_2026_11_07.jsonl
git commit -m "feat(mind): ingest and wire all 49 NFL/Fantasy/Prediction books into cognitive router"
```

---

### Task 4: Universal Phase-Transition Sheaf Cohomology (`L_F = delta^T delta`), Ollivier-Ricci Curvature & Phase Resultant (`r_controls()`) Bridge

**Files:**
- Create: `intelligence/ecosystem/universal_phase_transition_and_immortal_control_engine.py`
- Test: `tests/test_universal_phase_transition_and_immortal_control_engine.py`

**Interfaces:**
- Consumes: Quarter/half trajectory vectors and public payload dicts from Tasks 1–3
- Produces:
  - `UniversalPhaseTransitionEngine.r_controls(half1_phases_rad: list[float], half2_phases_rad: list[float]) -> dict[str, Any]`
  - `UniversalPhaseTransitionEngine.compute_sheaf_laplacian_and_ollivier_ricci(adj_matrix: list[list[float]], restriction_maps: dict[tuple[int, int], float]) -> dict[str, Any]`
  - `ImmortalControlPlaneProjector.project_public_environment(payload: dict[str, Any]) -> dict[str, Any]`

- [ ] **Step 1: Write the failing test in `tests/test_universal_phase_transition_and_immortal_control_engine.py`**

```python
from __future__ import annotations

import math
from intelligence.ecosystem.universal_phase_transition_and_immortal_control_engine import (
    ImmortalControlPlaneProjector,
    UniversalPhaseTransitionEngine,
)


def test_r_controls_separates_phase_lock_from_opposed_half_cancellation() -> None:
    # Locked phase across both halves -> R ~ 1.0
    locked = UniversalPhaseTransitionEngine.r_controls([0.2, 0.2, 0.2, 0.2], [0.2, 0.2, 0.2, 0.2])
    # Opposed-half cancellation (0 vs pi) -> R ~ 0.0 even when uniform magnitude spectral entropy is identical
    opposed = UniversalPhaseTransitionEngine.r_controls([0.0, 0.0, 0.0, 0.0], [math.pi, math.pi, math.pi, math.pi])
    assert locked["phase_resultant_r"] > 0.99
    assert opposed["phase_resultant_r"] < 0.01
    assert abs(locked["spectral_entropy_s_spec"] - opposed["spectral_entropy_s_spec"]) < 1e-6
    assert opposed["opposed_half_cancellation_detected"] is True


def test_sheaf_laplacian_and_ollivier_ricci_curvature_detect_bottleneck_edge() -> None:
    adj = [
        [0.0, 1.0, 0.0, 0.0],
        [1.0, 0.0, 1.0, 0.0],
        [0.0, 1.0, 0.0, 1.0],
        [0.0, 0.0, 1.0, 0.0],
    ]
    restrictions = {(0, 1): 1.0, (1, 2): -1.0, (2, 3): 1.0}
    res = UniversalPhaseTransitionEngine.compute_sheaf_laplacian_and_ollivier_ricci(adj, restrictions)
    assert res["sheaf_cohomology_h0_energy"] >= 0.0
    assert res["min_ollivier_ricci_curvature"] < 0.0


def test_immortal_control_plane_projector_enforces_ledger_and_redacts_paid_legs() -> None:
    raw = {
        "record_banner": "62-23-1",
        "benchmark": "86.12/100",
        "environment_pace_sec": 26.4,
        "official_pick": "SEA -2.5",
        "sgp_legs": ["JSN Over 93.5", "Kenneth Walker ATD"],
        "notes": "Computed via Romano CQR tau_hat and Sinkhorn",
    }
    pub = ImmortalControlPlaneProjector.project_public_environment(raw)
    assert pub["record_banner"] == "47-19-1 (+24.92u) | Base 38-13-1 (+22.85u)"
    assert "official_pick" not in pub
    assert "sgp_legs" not in pub
    assert "tau_hat" not in pub["notes"]
    assert pub["mutual_information_bound_satisfied"] is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_universal_phase_transition_and_immortal_control_engine.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Implement `intelligence/ecosystem/universal_phase_transition_and_immortal_control_engine.py`**

Implement:
1. `UniversalPhaseTransitionEngine`:
   - `r_controls`: Computes complex Kuramoto/Navier-Stokes Phase Resultant $R = \left|\frac{1}{N}\sum_{k=1}^N e^{i\theta_k}\right| \in [0, 1]$ alongside spectral entropy $S_{\text{spec}}$ (`4.1589` baseline) so opposed-half cancellation ($R \to 0$) is cleanly separated from locked 4-quarter phase ($R \to 1$).
   - `compute_sheaf_laplacian_and_ollivier_ricci`: Constructs cellular sheaf coboundary $\delta$ and sheaf Laplacian $L_{\mathcal{F}} = \delta^T \delta$, plus Wasserstein-1 Ollivier-Ricci edge curvature $\kappa_{OR}(u,v) = 1 - \frac{W_1(\mu_u, \mu_v)}{d(u,v)}$.
   - Diagnostics thresholds (`conformal_c_hat_max = 12.42`, `wasserstein_w1_shift = 0.08`, `cfb_close_crps_bar = 8.3314`, `nfl_close_crps_bar = 7.109`) and STM32H7 SAR-DLL `29.8 ps` $\Delta\text{ToF}$ timing budget check.
2. `ImmortalControlPlaneProjector`:
   - Enforces the superseding record (`47-19-1 (+24.92u) | Base 38-13-1 (+22.85u)` and `86.12/100` benchmark, scrubbing any legacy `62-23-1`, `31-11`, or `14-6` strings), strips paid picks/props/SGP legs from public surfaces ($\Pi_{\text{public}}$ mutual-information bound $I < \varepsilon$), and strips internal math jargon.

- [ ] **Step 4: Run test and Ruff to verify they pass**

Run: `python -m pytest tests/test_universal_phase_transition_and_immortal_control_engine.py -v && python -m ruff check intelligence/ecosystem/universal_phase_transition_and_immortal_control_engine.py tests/test_universal_phase_transition_and_immortal_control_engine.py`
Expected: `3 passed` and `All checks passed!`

- [ ] **Step 5: Commit**

```bash
git add intelligence/ecosystem/universal_phase_transition_and_immortal_control_engine.py tests/test_universal_phase_transition_and_immortal_control_engine.py
git commit -m "feat(phase): add cellular sheaf Laplacian, r_controls phase resultant, and public projector"
```

---

### Task 5: Unified Wave 1–5 Master Audit Receipt, Guardrail Verification & Research Documentation

**Files:**
- Create: `data/audits/wave5_dfs_congelio_49books_phase_integration_2026_11_07.json`
- Create: `docs/dfs/research/2026-11-07/WAVE5-DFS-CONGELIO-49BOOKS-SPEC.md`
- Test: `tests/test_wave5_end_to_end_receipt.py`

**Interfaces:**
- Consumes: All modules from Tasks 1–4 (`wave5_dfs_milp_and_robust_knapsack_engine.py`, `congelio_nfl_and_opencv_biomechanics_engine.py`, `google_drive_49_books_ingestion_and_wiring_engine.py`, `universal_phase_transition_and_immortal_control_engine.py`)
- Produces:
  - `run_wave5_master_integration() -> dict[str, Any]` (in `wave5_dfs_milp_and_robust_knapsack_engine.py`)

- [ ] **Step 1: Write the failing test in `tests/test_wave5_end_to_end_receipt.py`**

```python
from __future__ import annotations

from intelligence.ecosystem.wave5_dfs_milp_and_robust_knapsack_engine import (
    REPO_ROOT,
    run_wave5_master_integration,
)


def test_wave5_master_integration_receipt_and_docs_exist() -> None:
    receipt = run_wave5_master_integration()
    assert receipt["status"] == "PASS_WAVE5_ALL_REPOS_AND_49_BOOKS_VERIFIED"
    assert receipt["books_wired_count"] == 49
    assert receipt["dfs_repos_wired_count"] == 23
    assert (REPO_ROOT / "data" / "audits" / "wave5_dfs_congelio_49books_phase_integration_2026_11_07.json").exists()
    assert (REPO_ROOT / "docs" / "dfs" / "research" / "2026-11-07" / "WAVE5-DFS-CONGELIO-49BOOKS-SPEC.md").exists()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_wave5_end_to_end_receipt.py -v`
Expected: FAIL with `ImportError: cannot import name 'run_wave5_master_integration'`

- [ ] **Step 3: Implement `run_wave5_master_integration()` and write `docs/dfs/research/2026-11-07/WAVE5-DFS-CONGELIO-49BOOKS-SPEC.md`**

Wire Tasks 1–4 into `run_wave5_master_integration()`, write `data/audits/wave5_dfs_congelio_49books_phase_integration_2026_11_07.json`, and document the Pass-1 and Pass-2 architecture in `docs/dfs/research/2026-11-07/WAVE5-DFS-CONGELIO-49BOOKS-SPEC.md`.

- [ ] **Step 4: Run full multi-pass test suite, Ruff, and GSE guardrails**

Run: `python -m pytest tests/test_twelve_repo_frontier_integration.py tests/test_thirty_three_repo_frontier_integration.py tests/test_scientific_and_agentic_15_repo_engine.py tests/test_physics_biophysics_and_oncology_21_repo_engine.py tests/test_wave5_dfs_milp_and_robust_knapsack_engine.py tests/test_congelio_nfl_and_opencv_biomechanics_engine.py tests/test_google_drive_49_books_ingestion_and_wiring_engine.py tests/test_universal_phase_transition_and_immortal_control_engine.py tests/test_wave5_end_to_end_receipt.py -v && python -m ruff check intelligence/ecosystem/ tests/test_wave5_*.py && python scripts/guardrails/connected-workflow-dossier-guard.py`
Expected: All pytest suites PASS, `All checks passed!` from Ruff, and `PASS connected-workflow-dossier-guard`.

- [ ] **Step 5: Commit**

```bash
git add intelligence/ecosystem/ tests/test_wave5_*.py data/audits/wave5_dfs_congelio_49books_phase_integration_2026_11_07.json docs/dfs/research/2026-11-07/WAVE5-DFS-CONGELIO-49BOOKS-SPEC.md
git commit -m "feat(wave5): complete master receipt, 49-book wiring, and phase-transition verification"
```
