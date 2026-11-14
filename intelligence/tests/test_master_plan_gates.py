"""Comprehensive Pytest Verification Suite for GSE Week 10 Master Plan Gates.

Drop-in Path:
    C:\\Users\\Garrett\\Sports\\intelligence\\tests\\test_master_plan_gates.py

Runs natively under ``pytest -v`` on Windows (``C:\\Users\\Garrett\\Sports``) and also
includes a zero-dependency ``unittest`` fallback shim so every test and parametrized
case executes identically in air-gapped environments where the ``pytest`` wheel is
not installed.
"""

from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import inspect
import itertools
import json
import math
from pathlib import Path
import re
import sqlite3
import sys
from typing import Any, Callable, Iterator, List, Optional, Sequence, Tuple, Type

import numpy as np

try:
    import pytest  # type: ignore[import-not-found]

    HAS_NATIVE_PYTEST = True
except ImportError:  # pragma: no cover - used in air-gapped stdlib runner
    HAS_NATIVE_PYTEST = False

    class _ApproxValue:
        def __init__(self, expected: float, abs_tol: float = 1e-6, rel_tol: float = 1e-6) -> None:
            self.expected = float(expected)
            self.abs_tol = float(abs_tol)
            self.rel_tol = float(rel_tol)

        def __eq__(self, actual: object) -> bool:
            if not isinstance(actual, (int, float, np.floating)):
                return False
            tol = max(self.abs_tol, self.rel_tol * abs(self.expected))
            return abs(float(actual) - self.expected) <= tol

        def __repr__(self) -> str:
            return f"{self.expected} ± {self.abs_tol}"

    class _MarkNamespace:
        @staticmethod
        def parametrize(
            argnames: str, argvalues: Sequence[Any]
        ) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
            names = [n.strip() for n in argnames.split(",") if n.strip()]

            def _decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
                existing: List[Tuple[List[str], List[Any]]] = list(
                    getattr(fn, "_parametrize_specs", [])
                )
                existing.append((names, list(argvalues)))
                setattr(fn, "_parametrize_specs", existing)
                return fn

            return _decorator

    class _PytestCompat:
        mark = _MarkNamespace()

        @staticmethod
        def approx(expected: float, *, abs: float = 1e-6, rel: float = 1e-6) -> _ApproxValue:
            return _ApproxValue(expected, abs_tol=abs, rel_tol=rel)

        @staticmethod
        @contextmanager
        def raises(
            exc_type: Type[BaseException], match: Optional[str] = None
        ) -> Iterator[None]:
            try:
                yield
            except exc_type as exc:
                if match is not None and not re.search(match, str(exc)):
                    raise AssertionError(
                        f"Exception {exc!r} did not match regex {match!r}"
                    ) from exc
                return
            raise AssertionError(f"DID NOT RAISE {exc_type.__name__}")

        @staticmethod
        def fail(msg: str = "Explicit test failure") -> None:
            raise AssertionError(msg)

    pytest = _PytestCompat()  # type: ignore[assignment]

HERE = Path(__file__).resolve().parent
INT_ROOT = HERE.parent
REPO_ROOT = INT_ROOT.parent
for _p in (str(HERE), str(INT_ROOT / "calibration"), str(INT_ROOT / "decisions")):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from multimodal_decisions_router import (  # noqa: E402
    FORBIDDEN_FALLBACK_CONSTANTS,
    MAX_QUESTIONS_PER_PASS,
    DecisionQuestionSpec,
    MultimodalDecisionsRouter,
    assert_no_forbidden_fallback_constants,
    build_decisions_request_batches,
    compute_zero_fallback_displacement,
    pool_calibrated_pmfs,
    split_question_batches,
)
from oof_logit_temp_calibration import (  # noqa: E402
    HIERARCHICAL_RIDGE_LAMBDA,
    MAX_PLACEBO_ABS_MEAN_CLV,
    MIN_CONFORMAL_LCB_EDGE,
    PRIOR_INTERCEPT_A0,
    PRIOR_SLOPE_B0,
    SECONDS_PER_DAY,
    LogitTempCalibrator,
    PurgedEmbargoedChronologicalSplitter,
    american_to_decimal_odds,
    barber_conformal_abstention_gate,
    compute_rolling_oof_calibration_residuals,
    compute_three_class_push_ev,
    devig_two_way_decimal_odds,
    generate_purged_oof_calibrated_probs,
    logit,
    sigmoid,
    verify_shuffled_time_placebo_clv,
)

SQL_PATH = REPO_ROOT / "packages/db/prisma/migrations/20261113_board_quarantine_and_hnsw_fix/migration.sql"


def _strip_sql_comments(sql_text: str) -> str:
    """Strip single-line ``--`` and block ``/* ... */`` comments for active SQL inspection."""
    no_block = re.sub(r"/\*.*?\*/", "", sql_text, flags=re.DOTALL)
    lines = [
        line.split("--", 1)[0]
        for line in no_block.splitlines()
        if line.split("--", 1)[0].strip()
    ]
    return "\n".join(lines)


# =============================================================================
# 1. SQL DDL, PREDICATES Q1/Q2/Q3a & CHUNK_SEEDED_SQL HNSW INITPLAN TESTS
# =============================================================================


class TestBoardQuarantineAndHnswSql:
    """Verify WP-0 quarantine invariants, reversibility, and WP-6 HNSW InitPlan SQL."""

    def test_sql_file_exists_and_declares_audit_ddl_and_rollback(self) -> None:
        assert SQL_PATH.is_file(), f"Missing SQL deliverable at {SQL_PATH}"
        raw_sql = SQL_PATH.read_text(encoding="utf-8")
        active_sql = _strip_sql_comments(raw_sql)

        assert "CREATE TABLE IF NOT EXISTS public.pick_quarantine_audit" in active_sql
        assert "prior_is_published" in active_sql
        assert "five_stage_receipt_snapshot" in active_sql
        assert "INNER JOIN public.games g" in active_sql
        assert "CREATE OR REPLACE FUNCTION public.restore_quarantined_picks" in active_sql
        assert "PRESEASON_LOOKAHEAD_ZOMBIE" in active_sql
        assert "2026-09-04T00:00:00Z" in active_sql
        assert "INTERVAL '6 hours'" in active_sql
        assert "gatePassed" in active_sql

    def test_chunk_seeded_sql_replaces_cartesian_seed_with_initplan_and_guards(self) -> None:
        raw_sql = SQL_PATH.read_text(encoding="utf-8")
        match = re.search(
            r"-- CHUNK_SEEDED_SQL_BEGIN(.*?)-- CHUNK_SEEDED_SQL_END",
            raw_sql,
            flags=re.DOTALL,
        )
        assert match is not None, "CHUNK_SEEDED_SQL markers must wrap the fixed query."
        chunk_sql = _strip_sql_comments(match.group(1))

        assert not re.search(
            r"FROM\s+lit\.corpus_chunk\s+c\s*,\s*seed\b", chunk_sql, flags=re.IGNORECASE
        ), "Legacy Cartesian CTE join `FROM lit.corpus_chunk c, seed` must be removed."
        assert not re.search(
            r"\bWITH\s+seed\s+AS\b", chunk_sql, flags=re.IGNORECASE
        ), "Joined CTE `WITH seed AS` must be replaced by uncorrelated scalar InitPlan."

        assert (
            "SELECT set_config('hnsw.ef_search', '128', true);" in chunk_sql
        ), "Must set transaction-local hnsw.ef_search = 128 via set_config(..., true)."

        assert re.search(
            r"ORDER\s+BY\s+c\.embedding\s*<=>\s*\(\s*SELECT\s+s\.embedding\s+FROM\s+lit\.corpus_chunk\s+s\b.*?LIMIT\s+1\s*\)",
            chunk_sql,
            flags=re.IGNORECASE | re.DOTALL,
        ), "ORDER BY must compare c.embedding <=> uncorrelated scalar InitPlan subquery."

        assert "s.md5" in chunk_sql and "s.sha256" in chunk_sql
        assert re.search(
            r"\(\s*SELECT\s+s\.embedding\s+FROM\s+lit\.corpus_chunk\s+s\b.*?LIMIT\s+1\s*\)\s+IS\s+NOT\s+NULL",
            chunk_sql,
            flags=re.IGNORECASE | re.DOTALL,
        ), "Must guard uncorrelated scalar seed subquery with IS NOT NULL."

    def test_q1_q2_q3a_relational_execution_and_reversible_rollback_harness(self) -> None:
        """Execute exact Q1, Q2, Q3a predicate semantics (picks + games + injuries) + rollback."""
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        cur.executescript(
            """
            CREATE TABLE games (
                id TEXT PRIMARY KEY,
                commenceTime TEXT NOT NULL
            );
            CREATE TABLE picks (
                id TEXT PRIMARY KEY,
                gameId TEXT NOT NULL REFERENCES games(id),
                isPublished INTEGER NOT NULL,
                generatedAt TEXT NOT NULL,
                fiveStageReceipt TEXT
            );
            CREATE TABLE injuries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fetchedAt TEXT NOT NULL
            );
            CREATE TABLE pick_quarantine_audit (
                audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id TEXT NOT NULL,
                pick_id TEXT NOT NULL,
                game_id TEXT NOT NULL,
                primary_reason TEXT NOT NULL,
                prior_is_published INTEGER NOT NULL,
                pick_generated_at TEXT NOT NULL,
                event_commence_time TEXT NOT NULL,
                max_injury_fetched_at TEXT,
                five_stage_receipt_snapshot TEXT,
                quarantined_at TEXT NOT NULL,
                restored_at TEXT
            );
            """
        )

        eval_now = datetime(2026, 11, 13, 18, 0, 0, tzinfo=timezone.utc)
        latest_injury_ts = datetime(2026, 11, 13, 16, 30, 0, tzinfo=timezone.utc)
        cur.execute(
            "INSERT INTO injuries (fetchedAt) VALUES (?)",
            (latest_injury_ts.isoformat(),),
        )

        games_rows = [
            ("game_future_sunday", (eval_now + timedelta(days=2)).isoformat()),
            ("game_future_monday", (eval_now + timedelta(days=3)).isoformat()),
            ("game_past_completed", (eval_now - timedelta(hours=8)).isoformat()),
            ("game_recent_in_window", (eval_now - timedelta(hours=3)).isoformat()),
        ]
        cur.executemany("INSERT INTO games VALUES (?, ?)", games_rows)

        valid_receipt = json.dumps({"gatePassed": True, "stage": 5})
        failed_receipt = json.dumps({"gatePassed": False, "stage": 4})

        seed_picks = [
            (
                "pick_q1_stale_injury",
                "game_future_sunday",
                1,
                (latest_injury_ts - timedelta(hours=2)).isoformat(),
                valid_receipt,
            ),
            (
                "pick_q1_missing_gate",
                "game_future_sunday",
                1,
                (latest_injury_ts + timedelta(minutes=15)).isoformat(),
                failed_receipt,
            ),
            (
                "pick_q1_null_receipt",
                "game_future_sunday",
                1,
                (latest_injury_ts + timedelta(minutes=20)).isoformat(),
                None,
            ),
            (
                "pick_q2_preseason_zombie",
                "game_future_monday",
                1,
                "2026-08-29T12:00:00+00:00",
                valid_receipt,
            ),
            (
                "pick_q3a_completed_past_game",
                "game_past_completed",
                1,
                "2026-08-25T10:00:00+00:00",
                None,
            ),
            (
                "pick_recent_in_window_ungated",
                "game_recent_in_window",
                1,
                (latest_injury_ts + timedelta(minutes=5)).isoformat(),
                None,
            ),
            (
                "pick_clean_valid_future",
                "game_future_sunday",
                1,
                (latest_injury_ts + timedelta(minutes=30)).isoformat(),
                valid_receipt,
            ),
            (
                "pick_already_unpublished",
                "game_future_sunday",
                0,
                "2026-08-20T00:00:00+00:00",
                None,
            ),
        ]
        cur.executemany("INSERT INTO picks VALUES (?, ?, ?, ?, ?)", seed_picks)

        q3a_cutoff = (eval_now - timedelta(hours=6)).isoformat()
        preseason_cutoff = "2026-09-04T00:00:00+00:00"
        batch_id = "batch-week10-0001"

        candidates = cur.execute(
            """
            SELECT
                p.id,
                p.gameId,
                p.isPublished,
                p.generatedAt,
                g.commenceTime,
                p.fiveStageReceipt,
                (SELECT MAX(fetchedAt) FROM injuries) AS max_injury_ts
            FROM picks p
            INNER JOIN games g ON g.id = p.gameId
            WHERE
                p.isPublished = 1
                AND g.commenceTime >= ?
                AND (
                    p.generatedAt < ?
                    OR p.generatedAt < (SELECT MAX(fetchedAt) FROM injuries)
                    OR p.fiveStageReceipt IS NULL
                    OR COALESCE(json_extract(p.fiveStageReceipt, '$.gatePassed'), 0) != 1
                )
            """,
            (q3a_cutoff, preseason_cutoff),
        ).fetchall()

        quarantined_ids = {row["id"] for row in candidates}
        assert quarantined_ids == {
            "pick_q1_stale_injury",
            "pick_q1_missing_gate",
            "pick_q1_null_receipt",
            "pick_q2_preseason_zombie",
            "pick_recent_in_window_ungated",
        }
        assert "pick_q3a_completed_past_game" not in quarantined_ids
        assert "pick_clean_valid_future" not in quarantined_ids

        for row in candidates:
            reason = (
                "PRESEASON_LOOKAHEAD_ZOMBIE"
                if row["generatedAt"] < preseason_cutoff
                else "Q1_UNGATED_OR_STALE"
            )
            cur.execute(
                """
                UPDATE picks
                SET isPublished = 0
                WHERE id = ?
                  AND (SELECT commenceTime FROM games WHERE id = picks.gameId) >= ?
                """,
                (row["id"], q3a_cutoff),
            )
            cur.execute(
                """
                INSERT INTO pick_quarantine_audit (
                    batch_id, pick_id, game_id, primary_reason, prior_is_published,
                    pick_generated_at, event_commence_time, max_injury_fetched_at,
                    five_stage_receipt_snapshot, quarantined_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    batch_id,
                    row["id"],
                    row["gameId"],
                    reason,
                    row["isPublished"],
                    row["generatedAt"],
                    row["commenceTime"],
                    row["max_injury_ts"],
                    row["fiveStageReceipt"],
                    eval_now.isoformat(),
                ),
            )

        published_after = {
            r["id"]
            for r in cur.execute("SELECT id FROM picks WHERE isPublished = 1").fetchall()
        }
        assert published_after == {
            "pick_q3a_completed_past_game",
            "pick_clean_valid_future",
        }

        cur.execute(
            """
            UPDATE picks
            SET isPublished = (
                SELECT a.prior_is_published
                FROM pick_quarantine_audit a
                WHERE a.pick_id = picks.id AND a.batch_id = ? AND a.restored_at IS NULL
            )
            WHERE id IN (
                SELECT pick_id FROM pick_quarantine_audit WHERE batch_id = ? AND restored_at IS NULL
            )
            """,
            (batch_id, batch_id),
        )
        cur.execute(
            "UPDATE pick_quarantine_audit SET restored_at = ? WHERE batch_id = ?",
            ((eval_now + timedelta(minutes=5)).isoformat(), batch_id),
        )

        restored_state = {
            r["id"]: r["isPublished"]
            for r in cur.execute("SELECT id, isPublished FROM picks").fetchall()
        }
        expected_initial_state = {row[0]: row[2] for row in seed_picks}
        assert restored_state == expected_initial_state
        conn.close()


# =============================================================================
# 2. MULTIMODAL DECISIONS ROUTER TESTS (WP-1)
# =============================================================================


class TestMultimodalDecisionsRouter:
    """Verify DecisionQuestionSpec, <=100 batching, log-linear PMF pooling, and zero-fallback."""

    def test_valid_boolean_choice_and_score_question_specs(self) -> None:
        q_bool = DecisionQuestionSpec(
            key="qb1_active",
            kind="boolean",
            instructions="Return true iff the starting QB practiced in full on Friday.",
        )
        assert q_bool.validate() == {
            "type": "boolean",
            "instructions": "Return true iff the starting QB practiced in full on Friday.",
        }

        q_choice = DecisionQuestionSpec(
            key="tempo_regime",
            kind="choice",
            instructions="Classify offensive pace regime from pre-kickoff coordinator notes.",
            options=["up_tempo", "balanced", "clock_bleed"],
        )
        assert q_choice.validate()["options"] == ["up_tempo", "balanced", "clock_bleed"]

        q_score = DecisionQuestionSpec(
            key="ol_pass_block_integrity",
            kind="score",
            instructions="Score offensive line pass protection health from 1 to 5.",
            levels=5,
            legend={"1": "Multiple starters out", "3": "League average", "5": "All-Pro intact"},
        )
        validated_score = q_score.validate()
        assert validated_score["levels"] == 5
        assert validated_score["legend"]["1"] == "Multiple starters out"

    @pytest.mark.parametrize("bad_instructions", ["", "   ", "\n\t  "])
    @pytest.mark.parametrize("kind", ["boolean", "choice", "score"])
    def test_missing_or_blank_instructions_rejected_on_every_question_kind(
        self, bad_instructions: str, kind: Any
    ) -> None:
        spec = DecisionQuestionSpec(
            key="q_missing_inst",
            kind=kind,
            instructions=bad_instructions,
            options=["a", "b"] if kind == "choice" else None,
            levels=3 if kind == "score" else None,
            legend={"1": "low", "3": "high"} if kind == "score" else None,
        )
        with pytest.raises(ValueError, match="non-empty instructions"):
            spec.validate()

    @pytest.mark.parametrize("num_options", [0, 1, 256, 300])
    def test_choice_option_bounds_2_to_255_enforced(self, num_options: int) -> None:
        opts = [f"opt_{i}" for i in range(num_options)]
        spec = DecisionQuestionSpec(
            key="q_choice_bounds",
            kind="choice",
            instructions="Select exact coverage shell.",
            options=opts,
        )
        with pytest.raises(ValueError, match="2..255 options"):
            spec.validate()

    def test_choice_allows_boundary_2_and_255_options_and_rejects_duplicates(self) -> None:
        spec_2 = DecisionQuestionSpec(
            key="q_c2", kind="choice", instructions="Pick one.", options=["A", "B"]
        )
        assert len(spec_2.validate()["options"]) == 2

        spec_255 = DecisionQuestionSpec(
            key="q_c255",
            kind="choice",
            instructions="Pick exact bucket.",
            options=[f"bucket_{i}" for i in range(255)],
        )
        assert len(spec_255.validate()["options"]) == 255

        spec_dup = DecisionQuestionSpec(
            key="q_dup", kind="choice", instructions="Pick one.", options=["A", "A"]
        )
        with pytest.raises(ValueError, match="unique"):
            spec_dup.validate()

    @pytest.mark.parametrize("bad_levels", [None, 0, 1, 256, True])
    def test_score_level_bounds_2_to_255_enforced(self, bad_levels: Any) -> None:
        spec = DecisionQuestionSpec(
            key="q_score_bounds",
            kind="score",
            instructions="Rate Trench Advantage.",
            levels=bad_levels,
            legend={"1": "poor", "2": "good"},
        )
        with pytest.raises(ValueError, match="2..255 integer levels"):
            spec.validate()

    @pytest.mark.parametrize("bad_legend", [None, {}, {"1": "   "}])
    def test_score_requires_non_empty_legend(self, bad_legend: Any) -> None:
        spec = DecisionQuestionSpec(
            key="q_score_legend",
            kind="score",
            instructions="Rate Trench Advantage.",
            levels=4,
            legend=bad_legend,
        )
        with pytest.raises(ValueError, match="legend"):
            spec.validate()

    def test_batch_splitting_enforces_max_100_questions_per_pass(self) -> None:
        questions = [
            DecisionQuestionSpec(
                key=f"q_{idx}",
                kind="boolean",
                instructions=f"Verify signal predicate #{idx} from pre-game injury report.",
            )
            for idx in range(245)
        ]
        batches = split_question_batches(questions)
        assert [len(b) for b in batches] == [100, 100, 45]
        assert all(len(b) <= MAX_QUESTIONS_PER_PASS for b in batches)

        with pytest.raises(ValueError, match="1..100"):
            split_question_batches(questions, max_batch_size=101)

    def test_pool_calibrated_pmfs_log_linear_math_and_shrink_triggers(self) -> None:
        p_gd1 = {"home_cover": 0.62, "away_cover": 0.38}
        p_jev = {"home_cover": 0.56, "away_cover": 0.44}
        res_ok = pool_calibrated_pmfs(p_gd1, 0.80, p_jev, 0.70)
        assert res_ok["shrink_to_pass"] is False
        assert res_ok["disagreement_l_inf"] == pytest.approx(0.06, abs=1e-6)
        assert sum(res_ok["probabilities"].values()) == pytest.approx(1.0, abs=1e-12)

        w1, w2 = 0.80 / 1.50, 0.70 / 1.50
        raw_home = math.exp(w1 * math.log(0.62) + w2 * math.log(0.56))
        raw_away = math.exp(w1 * math.log(0.38) + w2 * math.log(0.44))
        expected_home = raw_home / (raw_home + raw_away)
        assert res_ok["probabilities"]["home_cover"] == pytest.approx(expected_home, abs=1e-9)

        res_disagree = pool_calibrated_pmfs(
            {"home_cover": 0.68, "away_cover": 0.32},
            0.90,
            {"home_cover": 0.53, "away_cover": 0.47},
            0.88,
        )
        assert res_disagree["disagreement_l_inf"] == pytest.approx(0.15, abs=1e-6)
        assert res_disagree["shrink_to_pass"] is True

        res_low_conf = pool_calibrated_pmfs(
            {"home_cover": 0.60, "away_cover": 0.40},
            0.85,
            {"home_cover": 0.60, "away_cover": 0.40},
            0.54,
        )
        assert res_low_conf["disagreement_l_inf"] == pytest.approx(0.0, abs=1e-6)
        assert res_low_conf["shrink_to_pass"] is True

    def test_zero_fallback_empty_input_returns_exact_zero_never_legacy_constants(self) -> None:
        empty_eval = compute_zero_fallback_displacement({})
        assert empty_eval.displacement == 0.0
        assert empty_eval.probability_shift == 0.0
        assert empty_eval.has_verified_signal is False
        assert empty_eval.displacement not in FORBIDDEN_FALLBACK_CONSTANTS

        none_eval = compute_zero_fallback_displacement(None)
        assert none_eval.displacement == 0.0

        null_fields_eval = compute_zero_fallback_displacement({"wind_delta": None, "qb_note": None})
        assert null_fields_eval.displacement == 0.0

        router = MultimodalDecisionsRouter(
            transport=lambda payload, headers: pytest.fail("Should not call network on {} input")
        )
        q = DecisionQuestionSpec(
            key="q1", kind="boolean", instructions="Check verified pre-game state."
        )
        out = router.dispatch_questions({}, [q])
        assert out["displacement"] == 0.0
        assert out["batches_sent"] == 0

        for forbidden in (0.58, -0.26):
            with pytest.raises(ValueError, match="Forbidden hardcoded fallback constant"):
                assert_no_forbidden_fallback_constants(forbidden)
            with pytest.raises(ValueError, match="Forbidden hardcoded fallback constant"):
                compute_zero_fallback_displacement({"legacy_leak": forbidden})

    def test_free_parallel_endpoint_blocks_media_and_data_uris(self) -> None:
        q = DecisionQuestionSpec(
            key="q_pub", kind="boolean", instructions="Evaluate public injury report status."
        )
        clean_batches = build_decisions_request_batches(
            {"team": "HOU", "spread": -3.5}, [q], model="parallel/decisions-fast:free"
        )
        assert len(clean_batches) == 1

        with pytest.raises(ValueError, match="Privacy boundary violation"):
            build_decisions_request_batches(
                {"film_clip": "https://cdn.example.com/all22_press.mp4"},
                [q],
                model="parallel/decisions-fast:free",
            )


# =============================================================================
# 3. OOF LOGIT-TEMP CALIBRATION, PUSH EV, PURGED SPLITTER, BARBER & PLACEBO (WP-2)
# =============================================================================


class TestOofLogitTempCalibrationAndGates:
    """Verify WP-2 calibration deflation, monotonicity, Push EV, OOF purge, Barber LCB, and placebo."""

    def test_prior_exactness_and_hierarchical_ridge_deflation_70_to_64_66(self) -> None:
        cal_empty = LogitTempCalibrator(
            lambda_ridge=HIERARCHICAL_RIDGE_LAMBDA,
            a_0=PRIOR_INTERCEPT_A0,
            b_0=PRIOR_SLOPE_B0,
        )
        fit_zero = cal_empty.fit([], [])
        assert fit_zero.a_m == pytest.approx(-0.22, abs=1e-12)
        assert fit_zero.b_m == pytest.approx(0.78, abs=1e-12)

        # Overconfident raw probability ledger (N = 2,000 settled games) where raw 70%
        # wins ~65.0% in reality; hierarchical Ridge (lambda = 25.0 toward a_0 = -0.22,
        # b_0 = 0.78) deflates raw 0.70 cleanly into ~0.64-0.66.
        rng = np.random.default_rng(20261113)
        p_raw = rng.uniform(0.51, 0.80, size=2_000)
        eta_true = -0.10 + 0.85 * np.asarray(logit(p_raw))
        p_true = np.asarray(sigmoid(eta_true))
        y_obs = rng.binomial(1, p_true)

        cal = LogitTempCalibrator(lambda_ridge=25.0, a_0=-0.22, b_0=0.78)
        fit_res = cal.fit(p_raw, y_obs)
        assert fit_res.converged is True
        assert 0.0 < fit_res.b_m <= 1.0

        p_cal_70 = float(cal.predict_proba(0.70))
        assert 0.64 <= p_cal_70 <= 0.66, (
            f"Expected 70/100 raw probability to deflate into [0.64, 0.66], got {p_cal_70:.4f}"
        )

    def test_monotonicity_enforced_under_inverted_and_over_steep_data(self) -> None:
        p_grid = np.linspace(0.20, 0.80, 120)
        y_inverted = (p_grid < 0.45).astype(float)
        cal_inv = LogitTempCalibrator(lambda_ridge=25.0, a_0=-0.22, b_0=0.78)
        fit_inv = cal_inv.fit(p_grid, y_inverted)
        assert 0.0 < fit_inv.b_m <= 1.0

        preds_inv = np.asarray(cal_inv.predict_proba(p_grid))
        assert np.all(np.diff(preds_inv) > 0.0), "Calibrated curve must remain strictly monotonic."

        y_step = (p_grid >= 0.50).astype(float)
        cal_steep = LogitTempCalibrator(lambda_ridge=1.0, a_0=-0.22, b_0=0.78)
        fit_steep = cal_steep.fit(p_grid, y_step)
        assert 0.0 < fit_steep.b_m <= 1.0

    def test_explicit_three_class_push_ev_math_and_edge_cases(self) -> None:
        o_dec = american_to_decimal_odds(-110)
        assert o_dec == pytest.approx(1.0 + 100.0 / 110.0, abs=1e-12)

        p_win_np = 0.56
        p_push = 0.08
        res = compute_three_class_push_ev(p_win_np, p_push, o_dec)
        expected_ev = p_win_np * (1.0 - p_push) * (o_dec - 1.0) - (1.0 - p_win_np) * (1.0 - p_push)
        assert res.ev == pytest.approx(expected_ev, abs=1e-12)

        res_no_push = compute_three_class_push_ev(p_win_np, 0.0, o_dec)
        assert res.ev == pytest.approx((1.0 - p_push) * res_no_push.ev, abs=1e-12)
        assert compute_three_class_push_ev(0.75, 1.0, o_dec).ev == pytest.approx(0.0, abs=1e-12)
        assert compute_three_class_push_ev(1.0 / o_dec, 0.09, o_dec).ev == pytest.approx(
            0.0, abs=1e-12
        )

        with pytest.raises(ValueError):
            compute_three_class_push_ev(1.05, 0.05, o_dec)
        with pytest.raises(ValueError):
            compute_three_class_push_ev(0.55, -0.01, o_dec)
        with pytest.raises(ValueError):
            compute_three_class_push_ev(0.55, 0.05, 1.0)

    def test_7_day_purged_embargoed_chronological_oof_splitter_prevents_leakage(self) -> None:
        base_dt = datetime(2026, 9, 4, 0, 0, tzinfo=timezone.utc)
        timestamps = [base_dt + timedelta(days=i) for i in range(120)]
        epochs = np.array([dt.timestamp() for dt in timestamps])

        causal_splitter = PurgedEmbargoedChronologicalSplitter(
            n_splits=5, purge_days=7.0, embargo_days=7.0, causal_past_only=True
        )
        folds_causal = list(causal_splitter.split(timestamps))
        assert len(folds_causal) == 5
        for train_idx, test_idx in folds_causal:
            assert len(set(train_idx) & set(test_idx)) == 0
            min_test_ts = float(np.min(epochs[test_idx]))
            max_train_ts = float(np.max(epochs[train_idx]))
            assert (min_test_ts - max_train_ts) > 7.0 * SECONDS_PER_DAY - 1e-6

        kfold_splitter = PurgedEmbargoedChronologicalSplitter(
            n_splits=5, purge_days=7.0, embargo_days=7.0, causal_past_only=False
        )
        folds_kfold = list(kfold_splitter.split(timestamps))
        assert len(folds_kfold) == 5
        for train_idx, test_idx in folds_kfold:
            t_start = float(np.min(epochs[test_idx]))
            t_end = float(np.max(epochs[test_idx]))
            for tr in train_idx:
                ts = float(epochs[tr])
                assert ts < (t_start - 7.0 * SECONDS_PER_DAY) or ts > (
                    t_end + 7.0 * SECONDS_PER_DAY
                )

        rng = np.random.default_rng(99)
        p_raw = rng.uniform(0.45, 0.75, size=120)
        y_true = rng.binomial(1, 0.55, size=120)
        oof_probs, fitted_mask = generate_purged_oof_calibrated_probs(p_raw, y_true, timestamps)
        assert oof_probs.shape == (120,)
        assert np.all((oof_probs > 0.0) & (oof_probs < 1.0))
        assert np.any(fitted_mask)

    def test_barber_conformal_lcb_abstention_gate_enforces_150bps_edge(self) -> None:
        q_devig = devig_two_way_decimal_odds(1.9090909, 1.9090909)
        assert q_devig == pytest.approx(0.50, abs=1e-7)

        rng = np.random.default_rng(7)
        oof_probs = rng.uniform(0.52, 0.65, size=10_000)
        oof_outcomes = rng.binomial(1, oof_probs)
        residuals = compute_rolling_oof_calibration_residuals(
            oof_probs, oof_outcomes, window_size=250
        )
        assert residuals.shape == (40,)

        pass_dec = barber_conformal_abstention_gate(0.58, q_devig, residuals, alpha=0.10)
        assert pass_dec.gate_passed is True
        assert pass_dec.lcb_edge >= MIN_CONFORMAL_LCB_EDGE
        assert pass_dec.abstention_reason is None

        abstain_dec = barber_conformal_abstention_gate(0.52, q_devig, residuals, alpha=0.10)
        assert abstain_dec.gate_passed is False
        assert abstain_dec.lcb_edge < MIN_CONFORMAL_LCB_EDGE
        assert abstain_dec.abstention_reason == "BARBER_LCB_EDGE_BELOW_150BPS"

        tiny_dec = barber_conformal_abstention_gate(0.75, q_devig, [0.0, 0.0, 0.0], alpha=0.10)
        assert tiny_dec.gate_passed is False
        assert tiny_dec.p_lcb == 0.0
        assert tiny_dec.abstention_reason == "INSUFFICIENT_CONFORMAL_HISTORY"

    def test_100_permutation_shuffled_time_placebo_nullity_and_leak_detection(self) -> None:
        rng = np.random.default_rng(20261113)
        n_bets = 400
        signal_scores = rng.normal(0.0, 0.03, size=n_bets)
        closing_deltas = 0.35 * signal_scores + rng.normal(0.0, 0.018, size=n_bets)

        placebo = verify_shuffled_time_placebo_clv(
            signal_scores,
            closing_deltas,
            n_permutations=100,
            max_abs_mean_clv=MAX_PLACEBO_ABS_MEAN_CLV,
            selection_threshold=0.005,
            seed=20261113,
        )
        assert placebo.n_permutations == 100
        assert len(placebo.per_run_mean_clvs) == 100
        assert placebo.abs_mean_placebo_clv <= 0.005, (
            f"Shuffled-time placebo |mean CLV| = {placebo.abs_mean_placebo_clv:.6f} exceeded 0.005"
        )
        assert placebo.passed is True

        leaky_placebo = verify_shuffled_time_placebo_clv(
            np.ones(n_bets),
            np.full(n_bets, 0.020),
            n_permutations=100,
            max_abs_mean_clv=MAX_PLACEBO_ABS_MEAN_CLV,
            seed=20261113,
        )
        assert leaky_placebo.passed is False
        assert leaky_placebo.abs_mean_placebo_clv > 0.005


def _run_fallback_suite_verbose() -> int:
    """Execute all test classes and parametrized cases when pytest wheel is absent."""
    test_classes = [
        TestBoardQuarantineAndHnswSql,
        TestMultimodalDecisionsRouter,
        TestOofLogitTempCalibrationAndGates,
    ]
    total = 0
    passed = 0
    failures: List[Tuple[str, BaseException]] = []

    print(
        f"platform {sys.platform} -- Python {sys.version.split()[0]}, "
        f"numpy-{np.__version__} (stdlib fallback runner; native pytest={HAS_NATIVE_PYTEST})"
    )
    print(f"rootdir: {HERE}")
    print("collecting ... ", end="", flush=True)

    collected: List[Tuple[str, Callable[[], None]]] = []
    for cls in test_classes:
        instance = cls()
        for name, method in inspect.getmembers(instance, predicate=inspect.ismethod):
            if not name.startswith("test_"):
                continue
            param_specs: List[Tuple[List[str], List[Any]]] = list(
                getattr(method, "_parametrize_specs", [])
            )
            if not param_specs:
                node_id = f"test_master_plan_gates.py::{cls.__name__}::{name}"
                collected.append((node_id, method))
            else:
                ordered_specs = list(reversed(param_specs))
                value_lists = [vals for _, vals in ordered_specs]
                name_lists = [nms for nms, _ in ordered_specs]
                for combo in itertools.product(*value_lists):
                    kwargs = {}
                    label_parts = []
                    for nms, val in zip(name_lists, combo):
                        if len(nms) == 1:
                            kwargs[nms[0]] = val
                            label_parts.append(repr(val))
                        else:
                            for sub_n, sub_v in zip(nms, val):
                                kwargs[sub_n] = sub_v
                            label_parts.append("-".join(repr(x) for x in val))
                    param_label = "-".join(label_parts)
                    node_id = (
                        f"test_master_plan_gates.py::{cls.__name__}::{name}[{param_label}]"
                    )
                    collected.append(
                        (node_id, (lambda m=method, kw=dict(kwargs): m(**kw)))
                    )

    print(f"collected {len(collected)} items\n")

    for node_id, runner in collected:
        total += 1
        try:
            runner()
            passed += 1
            print(f"{node_id} PASSED")
        except BaseException as exc:  # noqa: BLE001
            failures.append((node_id, exc))
            print(f"{node_id} FAILED ({type(exc).__name__}: {exc})")

    print()
    if failures:
        print(f"=== {len(failures)} failed, {passed} passed out of {total} items ===")
        return 1
    print(f"=== {passed} passed in stdlib verification harness (100% pass rate) ===")
    return 0


if __name__ == "__main__":
    if HAS_NATIVE_PYTEST:
        raise SystemExit(pytest.main(["-v", __file__]))
    raise SystemExit(_run_fallback_suite_verbose())
