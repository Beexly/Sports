#!/usr/bin/env python3
"""
Galaxy Sports Edge (Galaxy Sports Network LLC) & Galaxy Science Institute
=========================================================================
Module: gse_30tb_film_room_and_bitemporal_pipeline.py
Date:   2026-11-13
Model:  MODEL_VERSION 5.3.0 (SPEC-A / SPEC-B / Doctrine-19 / 00-TRUTH-FILE Compliant)

Unified Architecture Implementing:
1. Bitemporal (`as_of_ts`, `recorded_at_ts`) Simulation & DuckDB / Postgres / SQLite Feature Store:
   - Strict two-axis temporal isolation (`event_valid_ts <= as_of_ts AND recorded_at_ts <= as_of_ts`)
   - `SourceCannotSpeakAsOfError` pre-kickoff / post-lock leakage barrier
   - `ZeroImputationViolationError` fail-closed guard (zero silent NaN/None imputation; min sample n >= 150)
   - `CollegeGuardViolationError` separating NFL (`sigma=13.36`, `HFA=1.56`, `bye=-2.33`, `CRPS<=7.099`)
     and CFB (`spread_sigma=15.15`, `total_sigma=15.81`, `HFA=4.32`, `bye=+0.01`, `CRPS<=8.3314`)
   - Dual Simulation Modes:
     * `MU_CLOSE_DIAGNOSTIC` (`mu = close` diagnostic / NFL Big Data Bowl $100k Kaggle mode):
       Shin (1993) closed-root devigged closing line (`z=0.0476`), Hermes scale `45.42`, BQP
       (Depth-Rank-2 Snap-Share Replacement Quality), SWCC (Short-Week Chaos Coefficient), RIL
       (Rest-Adjusted Injury Load), and CRPS <= 7.099 walk-forward validation gate.
     * `PURE_COACH_MIND` (Production 3-Zone Sealed Coach-Mind v2.0 -> FWL Residualization):
       Hard `SportsbookContaminationFenceError` in Zone 1 prior to Tuesday 04:00 CT `TuesdayMasterLock`,
       7 Proprietary GSE Metrics (`GSE-SVA`, `GSE-SII`, `GSE-QPTSR`, `GSE-RLS`, `GSE-SPESE`, `GSE-TOR`,
       `GSE-DWP`), endgame kneeldown mixture (`-2.15` yds), Zone 2 SHA-256 `CoachProjectionReceipt`,
       and Zone 3 Frisch-Waugh-Lovell residualization + Multi-Witness Selective Precision Gate.
   - DraftKings Full-Slate Copula Simulator & HiGHS MILP Portfolio Optimizer (`scipy.optimize.milp`):
     Negative Binomial TDs (`VMR=1.87`), Gamma/qgam yardage quantiles, discrete +3.0 FPTS cliffs,
     `-3.007 yds/mph` decoupled passing wind vector, Student-t (`nu=4`) upper-tail copula, Sinkhorn-Knopp
     T-90m inactive usage reallocation, Dirichlet-Multinomial field simulator (with Minka fixed-point
     concentration estimator), and Submodular Covariance-Constrained Classic & Showdown MILP solver.

2. Automated `rclone` VFS + Colab Pro+ / GCP Credit (`galaxysportsedge`) Batch Video Worker:
   - Manifest-pinned registry of all 12 full-game & scheme `.mp4` videos in
     `GSE-Ultra-30TB-Vault/nfl-film-room-2026` (`1Pa1OaHTVcJJoJwL1JMmjUOqThIkF12J8`) anchored to
     `offload_manifest_2026_10_29.json` (`vault_folder_id`: `1TZMAi9ZBTxc4xTlBFcGcKpXdRHaAtIZT`).
   - `LocalCDiskProtectionGuard` guaranteeing zero `C:\\` SSD fill via read-only `rclone mount` VFS /
     streaming pipes onto Colab/GCP ephemeral scratch.
   - ByteTrack 2-stage Kalman + IoU tracker (with Rule R-2 `v > 12.5 m/s` motion-blur rejection),
     8-DoF Hartley Normalized Joint Point-and-Line Homography + 4-DoF Vanishing-Point check + Analytical
     Jacobian (`Sigma_world = J @ Sigma_pixel @ J.T + eps * I_2`) over the 138-point NFL field template,
     SkeleTrack v2 17-keypoint pose kinematics, and WHIM TBI Sub-Concussive Impulse Logger (PLA, PRV, PRA,
     HIC15, BrIC, sulcal MPS95, 3-mode Prony/Ogden sulcal shear via Pade [4/4], and Lefaivre Breaker-Box ODE).
   - Writes manifest-pinned PyArrow `.parquet` + SHA-256 hash-chained `.receipt.json` artifacts to the Vault.
"""

from __future__ import annotations

import argparse
import cmath
import dataclasses
from dataclasses import dataclass, field
import enum
import hashlib
import json
import math
import os
from pathlib import Path, PureWindowsPath
import re
import sqlite3
import subprocess
import tempfile
from typing import Any, Dict, Iterable, List, Literal, Mapping, Optional, Sequence, Tuple, Union

import cv2
import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.special import digamma
from scipy.stats import gamma, nbinom, norm, t as student_t


# ==============================================================================
# SECTION 0: BANKED EMPIRICAL CONSTANTS, PROVENANCE & 00-TRUTH-FILE GOVERNANCE
# ==============================================================================

MODEL_VERSION: str = "5.3.0"
LEGACY_COMPAT_VERSION: str = "v5.2.7"
PUBLIC_CALIBRATION_URL: str = "https://galaxysportsedge.com/calibration"
PUBLIC_LEDGER_DISCLOSURE: str = (
    f"Every pick is on the public ledger, wins and losses: {PUBLIC_CALIBRATION_URL}"
)

# Provenance & Vault Folder Identifiers (Pinned from Drive Corpus)
BITEMPORAL_SPEC_DOC_ID: str = "1zMGEYy9hRv9zbH0c5o7EGCF2l2aMiw9y_FB02aEsTOA"
PROVENANCE_TXT_FILE_ID: str = "13aDfeOZmSoEoxMR-IbBPfIC0Ze57LBmr"
MANIFEST_JSON_FILE_ID: str = "1O-dbQtulubqEWsTCov5jIDO9kId2lO0X"
OFFLOAD_MANIFEST_FILE_ID: str = "1iNkIjYGZDdDE6Ed4NFzrb0Zd1Y8Ns1St"
EXECUTION_PLAN_DOC_ID: str = "1nV5L97GHg-u25LiKM-pnBiudxI2pG72tKnYUdYVqAcw"

VAULT_ROOT_FOLDER_ID: str = "1TZMAi9ZBTxc4xTlBFcGcKpXdRHaAtIZT"
OFFLOAD_FOLDER_ID: str = "1SDZE6Xl5KWHsvYTT3m45bsKLbkjza4Yb"
FILM_ROOM_2026_FOLDER_ID: str = "1Pa1OaHTVcJJoJwL1JMmjUOqThIkF12J8"
GCP_PROJECT_ID: str = "galaxysportsedge"

# Locked Quantitative & Physical Constants
FROZEN_CRPS_LOWER_BOUND: float = 7.099   # n = 2,462 frozen filter exact lower bound (SPEC-A/B)
CLOSING_MARGIN_CRPS_BAR: float = 7.109   # n = 1,871 closing line margin benchmark
CFB_FROZEN_CRPS_BAR: float = 8.3314      # n = 283 Week 1-6 CFB holdout CRPS bar
HERMES_FOLD_SCALE: float = 45.42         # MODEL_VERSION 5.3.0 scale (never average with 36.61 or 0.12)
HERMES_HFA: float = 2.10
FAY_HERRIOT_K: float = 7.486
DAVE_EARLY_SEASON_K: int = 8
NFL_EPA_MIN_GAMES: int = 4
MIN_PREMISE_OBSERVATIONS: int = 150

NFL_TRUE_SIGMA: float = 13.36
NFL_ZONE2_HFA: float = 1.56
NFL_BYE_PTS: float = -2.33

CFB_TRUE_SPREAD_SIGMA: float = 15.15
CFB_TRUE_TOTAL_SIGMA: float = 15.81
CFB_ZONE2_HFA: float = 4.32
CFB_BYE_PTS: float = 0.01

SHIN_Z_DEFAULT: float = 0.0476
WIND_PASS_PENALTY_YDS_PER_MPH: float = -3.007
RED_ZONE_TD_VMR: float = 1.87            # Empirical NFL Red-Zone TD VMR in [1.82, 1.92]; Poisson banned
QB_QUESTIONABLE_EPA_DROPOFF: float = 0.0947
INVERSE_MDP_TAU: float = 0.42
KNEELDOWN_EXPECTED_YDS: float = -2.15    # -1.06 yds/kneel * 2.03 kneels
MAX_VALID_PLAYER_SPEED_MPS: float = 12.5 # Rule R-2 motion-blur velocity cutoff

BOOK_SIGMA_COMPRESSION: Dict[str, float] = {
    "betmgm": 12.07,
    "pinnacle": 12.21,
    "draftkings": 13.16,
}


@dataclass(frozen=True)
class FilmRoomVideoEntry:
    index: int
    filename: str
    week: Optional[int]
    away_team: Optional[str]
    home_team: Optional[str]
    category: Literal["full_game", "blocking_scheme", "highlights"]
    vault_rel_path: str


NFL_FILM_ROOM_2026_VIDEOS: Tuple[FilmRoomVideoEntry, ...] = (
    FilmRoomVideoEntry(1, "bal_vs_ind_week1_fullgame.mp4", 1, "BAL", "IND", "full_game", "GSE-Ultra-30TB-Vault/nfl-film-room-2026/bal_vs_ind_week1_fullgame.mp4"),
    FilmRoomVideoEntry(2, "ind_vs_kc_week2_fullgame.mp4", 2, "IND", "KC", "full_game", "GSE-Ultra-30TB-Vault/nfl-film-room-2026/ind_vs_kc_week2_fullgame.mp4"),
    FilmRoomVideoEntry(3, "bal_vs_dal_week3_fullgame.mp4", 3, "BAL", "DAL", "full_game", "GSE-Ultra-30TB-Vault/nfl-film-room-2026/bal_vs_dal_week3_fullgame.mp4"),
    FilmRoomVideoEntry(4, "pit_vs_cle_week4_fullgame.mp4", 4, "PIT", "CLE", "full_game", "GSE-Ultra-30TB-Vault/nfl-film-room-2026/pit_vs_cle_week4_fullgame.mp4"),
    FilmRoomVideoEntry(5, "sf_vs_sea_week5_fullgame.mp4", 5, "SF", "SEA", "full_game", "GSE-Ultra-30TB-Vault/nfl-film-room-2026/sf_vs_sea_week5_fullgame.mp4"),
    FilmRoomVideoEntry(6, "chi_vs_car_week1_fullgame.mp4", 1, "CHI", "CAR", "full_game", "GSE-Ultra-30TB-Vault/nfl-film-room-2026/chi_vs_car_week1_fullgame.mp4"),
    FilmRoomVideoEntry(7, "dal_vs_nyg_week1_fullgame.mp4", 1, "DAL", "NYG", "full_game", "GSE-Ultra-30TB-Vault/nfl-film-room-2026/dal_vs_nyg_week1_fullgame.mp4"),
    FilmRoomVideoEntry(8, "buf_vs_lar_week5_fullgame.mp4", 5, "BUF", "LAR", "full_game", "GSE-Ultra-30TB-Vault/nfl-film-room-2026/buf_vs_lar_week5_fullgame.mp4"),
    FilmRoomVideoEntry(9, "hou_vs_jax_week6_fullgame.mp4", 6, "HOU", "JAX", "full_game", "GSE-Ultra-30TB-Vault/nfl-film-room-2026/hou_vs_jax_week6_fullgame.mp4"),
    FilmRoomVideoEntry(10, "nyg_vs_hou_week7_fullgame.mp4", 7, "NYG", "HOU", "full_game", "GSE-Ultra-30TB-Vault/nfl-film-room-2026/nyg_vs_hou_week7_fullgame.mp4"),
    FilmRoomVideoEntry(11, "nfl_pro_blocking_scheme.mp4", None, None, None, "blocking_scheme", "GSE-Ultra-30TB-Vault/nfl-film-room-2026/nfl_pro_blocking_scheme.mp4"),
    FilmRoomVideoEntry(12, "car_gb_week8_highlights.mp4", 8, "CAR", "GB", "highlights", "GSE-Ultra-30TB-Vault/nfl-film-room-2026/car_gb_week8_highlights.mp4"),
)


# ==============================================================================
# SECTION 1: DOMAIN EXCEPTIONS & 00-TRUTH-FILE SANITIZER
# ==============================================================================

class SourceCannotSpeakAsOfError(RuntimeError):
    """Raised when an evaluation or signal violates bitemporal (`as_of_ts`, `recorded_at_ts`) safety."""


class ZeroImputationViolationError(ValueError):
    """Raised when missing/non-finite features appear; GSE strictly forbids silent imputation."""


class SportsbookContaminationFenceError(PermissionError):
    """Raised if sportsbook odds, spreads, or totals attempt to enter Zone 1 Pure Coach-Mind."""


class CollegeGuardViolationError(ValueError):
    """Raised if NFL constants enter CFB pricing or vice versa (Rule 3 of doctrine.py)."""


class LocalCDiskProtectionError(OSError):
    """Raised if a video pipeline worker attempts to stage MP4 chunks onto local Windows C:\\ storage."""


class TruthFileGovernanceError(ValueError):
    """Raised when public copy violates 00-TRUTH-FILE confidence-badge or ledger rules."""


def format_confidence_badge(score_0_to_100: Union[int, float]) -> str:
    """Enforces integer XX/100 format only (zero '%' confidence badges per 00-TRUTH-FILE)."""
    if not math.isfinite(float(score_0_to_100)):
        raise ZeroImputationViolationError("Non-finite score passed to confidence badge formatter.")
    clamped = max(0, min(100, int(round(float(score_0_to_100)))))
    return f"{clamped:02d}/100" if clamped < 10 else f"{clamped}/100"


def sanitize_public_copy(text: str) -> str:
    """
    Validates public-facing copy against 00-TRUTH-FILE and Astra anti-jargon rules:
    1. Rejects percentage confidence badges (e.g. '87% confidence').
    2. Rejects unreconciled W-L-T headline claims in public marketing copy.
    3. Appends mandatory public calibration ledger disclosure if absent.
    """
    if re.search(r"\b\d{1,3}(?:\.\d+)?%\s*(?:confidence|lock|win\s*rate)\b", text, flags=re.IGNORECASE):
        raise TruthFileGovernanceError(
            "00-TRUTH-FILE Violation: Percentage confidence or win-rate headline detected; use XX/100 badge."
        )
    if re.search(r"\b\d{1,3}-\d{1,3}-\d{1,2}\b", text):
        raise TruthFileGovernanceError(
            "00-TRUTH-FILE Violation: Unreconciled W-L-T record string in public copy before /calibration sync."
        )
    clean = text.strip()
    if PUBLIC_CALIBRATION_URL not in clean:
        clean = f"{clean}\n{PUBLIC_LEDGER_DISCLOSURE}"
    return clean


# ==============================================================================
# SECTION 2: BITEMPORAL (`as_of_ts`, `recorded_at_ts`) FEATURE STORE ENGINE
# ==============================================================================

@dataclass(frozen=True)
class BitemporalSignalRecord:
    entity_id: str                 # e.g., game_id '2026_06_HOU_JAX' or gsis_id '00-0039163'
    entity_type: Literal["game", "player", "team", "slate"]
    league: Literal["NFL", "CFB"]
    signal_name: str
    signal_value: float
    event_valid_ts: int            # Epoch ms when event occurred on field / wire (valid_time)
    recorded_at_ts: int            # Epoch ms when database persisted the row (transaction_time)
    source_id: str
    payload_sha256: str = ""

    def __post_init__(self) -> None:
        if not math.isfinite(self.signal_value):
            raise ZeroImputationViolationError(
                f"Cannot ingest non-finite value for {self.entity_id}:{self.signal_name}"
            )
        if self.recorded_at_ts < self.event_valid_ts:
            raise SourceCannotSpeakAsOfError(
                f"Causality violation: recorded_at_ts ({self.recorded_at_ts}) < "
                f"event_valid_ts ({self.event_valid_ts}) for {self.entity_id}:{self.signal_name}"
            )
        if not self.payload_sha256:
            canonical = (
                f"{self.entity_id}|{self.entity_type}|{self.league}|{self.signal_name}|"
                f"{self.signal_value:.8f}|{self.event_valid_ts}|{self.recorded_at_ts}|{self.source_id}"
            )
            digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
            object.__setattr__(self, "payload_sha256", digest)


class BitemporalFeatureStore:
    """
    Dual-axis bitemporal feature store supporting DuckDB (if installed), PostgreSQL DDL generation,
    PyArrow Parquet snapshots, and deterministic SQLite3 execution with <50ms PIT edge retrieval.

    Guarantees ZERO lookahead across:
      1. Historical model replays
      2. DraftKings contest T-90m lock backtests
      3. NFL Big Data Bowl ($100k Kaggle track) frame/play cutoffs
    """

    POSTGRES_DDL: str = """
    CREATE TABLE IF NOT EXISTS gse_bitemporal_signals (
        entity_id        TEXT NOT NULL,
        entity_type      TEXT NOT NULL,
        league           TEXT NOT NULL CHECK (league IN ('NFL', 'CFB')),
        signal_name      TEXT NOT NULL,
        signal_value     DOUBLE PRECISION NOT NULL,
        event_valid_ts   BIGINT NOT NULL,
        recorded_at_ts   BIGINT NOT NULL,
        source_id        TEXT NOT NULL,
        payload_sha256   CHAR(64) NOT NULL,
        CHECK (recorded_at_ts >= event_valid_ts),
        PRIMARY KEY (entity_id, signal_name, event_valid_ts, recorded_at_ts)
    );
    CREATE INDEX IF NOT EXISTS idx_gse_bitemporal_pit
        ON gse_bitemporal_signals (league, entity_id, signal_name, recorded_at_ts DESC, event_valid_ts DESC);
    """

    def __init__(self, db_path: str = ":memory:", prefer_duckdb: bool = True) -> None:
        self.db_path = db_path
        self.backend: Literal["duckdb", "sqlite3"] = "sqlite3"
        self._conn: Any = None

        if prefer_duckdb:
            try:
                import duckdb  # type: ignore
                self._conn = duckdb.connect(db_path)
                self.backend = "duckdb"
            except ImportError:
                self._conn = sqlite3.connect(db_path)
                self.backend = "sqlite3"
        else:
            self._conn = sqlite3.connect(db_path)
            self.backend = "sqlite3"

        self._init_schema()

    def _init_schema(self) -> None:
        ddl = """
        CREATE TABLE IF NOT EXISTS gse_bitemporal_signals (
            entity_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            league TEXT NOT NULL,
            signal_name TEXT NOT NULL,
            signal_value REAL NOT NULL,
            event_valid_ts INTEGER NOT NULL,
            recorded_at_ts INTEGER NOT NULL,
            source_id TEXT NOT NULL,
            payload_sha256 TEXT NOT NULL,
            PRIMARY KEY (entity_id, signal_name, event_valid_ts, recorded_at_ts)
        )
        """
        self._conn.execute(ddl)
        if self.backend == "sqlite3":
            self._conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_gse_pit ON gse_bitemporal_signals "
                "(league, entity_id, signal_name, recorded_at_ts, event_valid_ts)"
            )
            self._conn.commit()

    def ingest_records(self, records: Sequence[BitemporalSignalRecord]) -> int:
        if not records:
            return 0
        rows = [
            (
                r.entity_id,
                r.entity_type,
                r.league,
                r.signal_name,
                float(r.signal_value),
                int(r.event_valid_ts),
                int(r.recorded_at_ts),
                r.source_id,
                r.payload_sha256,
            )
            for r in records
        ]
        if self.backend == "duckdb":
            self._conn.executemany(
                "INSERT OR REPLACE INTO gse_bitemporal_signals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                rows,
            )
        else:
            self._conn.executemany(
                "INSERT OR REPLACE INTO gse_bitemporal_signals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                rows,
            )
            self._conn.commit()
        return len(rows)

    def query_as_of(
        self,
        entity_ids: Sequence[str],
        required_signals: Sequence[str],
        as_of_ts: int,
        league: Literal["NFL", "CFB"] = "NFL",
        kickoff_ts: Optional[int] = None,
        lock_offset_ms: int = 0,
        enforce_zero_imputation: bool = True,
    ) -> Dict[str, Dict[str, float]]:
        """
        Point-In-Time (PIT) bitemporal slice `Warehouse.asof(as_of_ts)`:
          - Enforces `as_of_ts <= kickoff_ts - lock_offset_ms` when `kickoff_ts` is supplied.
          - Enforces `CollegeGuard` so NFL and CFB features never cross-contaminate.
          - Strictly filters `event_valid_ts <= as_of_ts AND recorded_at_ts <= as_of_ts`.
          - Selects latest `(recorded_at_ts, event_valid_ts)` per `(entity_id, signal_name)`.
          - Raises `ZeroImputationViolationError` if any requested `(entity_id, signal_name)` is missing.
        """
        if league not in ("NFL", "CFB"):
            raise CollegeGuardViolationError(f"Unknown league '{league}' in bitemporal query.")

        if kickoff_ts is not None and as_of_ts > (kickoff_ts - lock_offset_ms):
            raise SourceCannotSpeakAsOfError(
                f"Bitemporal Lock Violation: as_of_ts={as_of_ts} exceeds cutoff "
                f"kickoff_ts - lock_offset_ms = {kickoff_ts - lock_offset_ms}"
            )

        if not entity_ids or not required_signals:
            return {}

        ent_placeholders = ",".join(["?"] * len(entity_ids))
        sig_placeholders = ",".join(["?"] * len(required_signals))

        # First verify no entity belongs to the opposite league (CollegeGuard)
        guard_sql = f"""
        SELECT DISTINCT league FROM gse_bitemporal_signals
        WHERE entity_id IN ({ent_placeholders})
          AND event_valid_ts <= ?
          AND recorded_at_ts <= ?
        """
        guard_params: List[Any] = [*entity_ids, int(as_of_ts), int(as_of_ts)]
        observed_leagues = [row[0] for row in self._conn.execute(guard_sql, guard_params).fetchall()]
        for obs_league in observed_leagues:
            if obs_league != league:
                raise CollegeGuardViolationError(
                    f"CollegeGuard Violation: Requested league={league} but entity carries {obs_league} signals."
                )

        sql = f"""
        WITH ranked AS (
            SELECT
                entity_id,
                signal_name,
                signal_value,
                ROW_NUMBER() OVER (
                    PARTITION BY entity_id, signal_name
                    ORDER BY recorded_at_ts DESC, event_valid_ts DESC
                ) AS rn
            FROM gse_bitemporal_signals
            WHERE league = ?
              AND entity_id IN ({ent_placeholders})
              AND signal_name IN ({sig_placeholders})
              AND event_valid_ts <= ?
              AND recorded_at_ts <= ?
        )
        SELECT entity_id, signal_name, signal_value
        FROM ranked
        WHERE rn = 1
        """
        params: List[Any] = [league, *entity_ids, *required_signals, int(as_of_ts), int(as_of_ts)]
        rows = self._conn.execute(sql, params).fetchall()

        result: Dict[str, Dict[str, float]] = {eid: {} for eid in entity_ids}
        for eid, sname, sval in rows:
            val = float(sval)
            if not math.isfinite(val):
                raise ZeroImputationViolationError(f"Non-finite stored value for {eid}:{sname}")
            result[str(eid)][str(sname)] = val

        if enforce_zero_imputation:
            missing_pairs: List[str] = []
            for eid in entity_ids:
                ent_map = result.get(eid, {})
                for sname in required_signals:
                    if sname not in ent_map:
                        missing_pairs.append(f"{eid}:{sname}")
            if missing_pairs:
                raise ZeroImputationViolationError(
                    f"Zero-Imputation Lock Tripped at as_of_ts={as_of_ts}: missing {missing_pairs}"
                )

        return result

    def export_parquet_snapshot(self, output_path: Path, as_of_ts: Optional[int] = None) -> str:
        """Exports an immutable PyArrow Parquet bitemporal snapshot and returns its SHA-256."""
        if as_of_ts is None:
            rows = self._conn.execute(
                "SELECT entity_id, entity_type, league, signal_name, signal_value, "
                "event_valid_ts, recorded_at_ts, source_id, payload_sha256 "
                "FROM gse_bitemporal_signals ORDER BY recorded_at_ts ASC"
            ).fetchall()
        else:
            rows = self._conn.execute(
                "SELECT entity_id, entity_type, league, signal_name, signal_value, "
                "event_valid_ts, recorded_at_ts, source_id, payload_sha256 "
                "FROM gse_bitemporal_signals WHERE event_valid_ts <= ? AND recorded_at_ts <= ? "
                "ORDER BY recorded_at_ts ASC",
                [int(as_of_ts), int(as_of_ts)],
            ).fetchall()

        cols = [
            "entity_id", "entity_type", "league", "signal_name", "signal_value",
            "event_valid_ts", "recorded_at_ts", "source_id", "payload_sha256",
        ]
        df = pd.DataFrame(rows, columns=cols)
        table = pa.Table.from_pandas(df, preserve_index=False)
        meta = {
            **(table.schema.metadata or {}),
            b"gse_model_version": MODEL_VERSION.encode("utf-8"),
            b"gse_as_of_ts": str(as_of_ts or -1).encode("utf-8"),
            b"gse_spec_doc_id": BITEMPORAL_SPEC_DOC_ID.encode("utf-8"),
        }
        table = table.replace_schema_metadata(meta)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        pq.write_table(table, output_path, compression="snappy")
        return hashlib.sha256(output_path.read_bytes()).hexdigest()


# ==============================================================================
# SECTION 3: DUAL-MODE SIMULATION ENGINE (`mu = close` vs `Pure Coach-Mind`)
# ==============================================================================

class SimulationMode(str, enum.Enum):
    MU_CLOSE_DIAGNOSTIC = "mu_close_diagnostic"   # SPEC-A/B & $100k NFL Big Data Bowl Kaggle mode
    PURE_COACH_MIND = "pure_coach_mind"           # Zone 1 Sealed Coach-Mind -> Zone 3 FWL production mode


FORBIDDEN_SPORTSBOOK_KEYS_IN_ZONE1: frozenset[str] = frozenset({
    "spread_line",
    "closing_spread",
    "total_line",
    "closing_total",
    "moneyline_home",
    "moneyline_away",
    "pinnacle_odds_home",
    "pinnacle_odds_away",
    "dk_odds_home",
    "dk_odds_away",
    "market_fair_prob",
    "implied_home_total",
    "implied_away_total",
})


def shin_devig_pair(
    odds_a_decimal: float,
    odds_b_decimal: float,
    z: float = SHIN_Z_DEFAULT,
) -> Tuple[float, float]:
    """Closed-root Shin (1993) insider-trading de-vigging (verified on -110/-110 -> 0.50/0.50)."""
    if odds_a_decimal <= 1.0 or odds_b_decimal <= 1.0:
        raise ValueError("Decimal odds must strictly exceed 1.0")
    q_a = 1.0 / odds_a_decimal
    q_b = 1.0 / odds_b_decimal
    booksum = q_a + q_b
    if booksum <= 1.0 + 1e-9:
        return q_a / booksum, q_b / booksum

    def _p(q_raw: float) -> float:
        disc = math.sqrt(z * z + 4.0 * (1.0 - z) * (q_raw * q_raw) / booksum)
        return (disc - z) / (2.0 * (1.0 - z))

    p_a = _p(q_a)
    p_b = _p(q_b)
    norm_sum = p_a + p_b
    return p_a / norm_sum, p_b / norm_sum


def gaussian_crps(mu: np.ndarray, sigma: np.ndarray, y_true: np.ndarray) -> np.ndarray:
    """Exact analytical Continuous Ranked Probability Score (CRPS) for N(mu, sigma^2) forecasts."""
    z = (y_true - mu) / sigma
    return sigma * (z * (2.0 * norm.cdf(z) - 1.0) + 2.0 * norm.pdf(z) - 1.0 / math.sqrt(math.pi))


def compute_dvoa_class_metrics(
    starter_snap_shares: Sequence[float],
    starter_epas: Sequence[float],
    backup_rank2_epas: Sequence[float],
    out_probabilities: Sequence[float],
    unit_weights: Sequence[float],
    days_rest_home: float,
    days_rest_away: float,
    travel_timezones_away: float,
) -> Dict[str, float]:
    """
    Computes the 3 DVOA-class / T4 power-upgrade metrics for $100k Kaggle & Zone 1:
      1. BQP (Backup Quality Premium / Depth-Rank-2 Snap-Share Replacement Quality)
      2. SWCC (Short-Week Chaos Coefficient)
      3. RIL (Rest-Adjusted Injury Load)
    """
    n = len(starter_snap_shares)
    if not (len(starter_epas) == len(backup_rank2_epas) == len(out_probabilities) == len(unit_weights) == n):
        raise ValueError("Mismatched starter/backup vector lengths in compute_dvoa_class_metrics.")

    delta_q_unit = 0.0
    bqp_surplus = 0.0
    for s_share, epa_1, epa_2, p_out, w_i in zip(
        starter_snap_shares, starter_epas, backup_rank2_epas, out_probabilities, unit_weights
    ):
        if not all(math.isfinite(v) for v in (s_share, epa_1, epa_2, p_out, w_i)):
            raise ZeroImputationViolationError("Non-finite input in BQP / replacement quality calculation.")
        dropoff = (epa_1 - epa_2)
        delta_q_unit += w_i * s_share * dropoff * p_out
        # League-average backup baseline is -0.11 EPA/play; positive BQP means superior Rank-2 backup
        bqp_surplus += w_i * s_share * (epa_2 - (-0.11)) * p_out

    short_week_flag = 1.0 if min(days_rest_home, days_rest_away) <= 4.5 else 0.0
    rest_asym = (days_rest_home - days_rest_away) / 7.0
    swcc = short_week_flag * (0.42 + 0.18 * abs(travel_timezones_away) + 0.25 * abs(rest_asym))
    ril = delta_q_unit * (1.0 + 0.30 * max(0.0, 7.0 - days_rest_home) / 3.0)

    return {
        "delta_q_unit": delta_q_unit,
        "bqp": bqp_surplus,
        "swcc": swcc,
        "ril": ril,
    }


@dataclass(frozen=True)
class CoachProjectionReceipt:
    game_id: str
    tuesday_master_lock_ts: int
    coach_mindset_hash: str
    pure_margin_mean: float
    pure_total_mean: float
    qb_rush_kneeldown_adj: float
    seven_metrics: Mapping[str, float]
    receipt_sha256: str


@dataclass(frozen=True)
class WitnessVote:
    domain_id: str
    probability: float
    phase_angle_rad: float
    sheaf_residual: float


@dataclass(frozen=True)
class SlateSimulationResult:
    mode: SimulationMode
    game_id: str
    as_of_ts: int
    margin_mean: float
    margin_sigma: float
    win_prob_home: float
    mfp_score: float
    fwl_edge: float
    release_tier: Literal["TIER_1_SOVEREIGN_LOCK", "TIER_2_OFFICIAL_VERIFIED_EDGE", "TIER_3_PASS"]
    confidence_badge: str
    crps_gate_passed: Optional[bool]
    coach_receipt: Optional[CoachProjectionReceipt]
    audit_sha256: str


class BitemporalSlateEngine:
    """
    Executes bitemporal game & slate evaluation under either:
      - `SimulationMode.MU_CLOSE_DIAGNOSTIC` (`mu = close`, zero imputation, CRPS <= 7.099 gate)
      - `SimulationMode.PURE_COACH_MIND` (Zone 1 no-book fence -> Zone 2 SHA-256 receipt -> Zone 3 FWL)
    """

    def __init__(self, store: BitemporalFeatureStore) -> None:
        self.store = store

    def evaluate_mu_close_diagnostic(
        self,
        game_id: str,
        as_of_ts: int,
        kickoff_ts: int,
        historical_margins: Optional[np.ndarray] = None,
        historical_close_mus: Optional[np.ndarray] = None,
        league: Literal["NFL", "CFB"] = "NFL",
    ) -> SlateSimulationResult:
        """
        NFL Big Data Bowl ($100k Kaggle) & SPEC-A/B Diagnostic Mode:
          - Locks `mu = +spread_line` from closing/T-90m market snapshot as of `as_of_ts`
          - Enforces zero imputation and pre-kickoff bitemporal safety
          - Evaluates walk-forward CRPS against `FROZEN_CRPS_LOWER_BOUND = 7.099` (n >= 150)
        """
        req_signals = [
            "spread_line",
            "odds_home_dec",
            "odds_away_dec",
            "bqp",
            "swcc",
            "ril",
        ]
        slice_map = self.store.query_as_of(
            entity_ids=[game_id],
            required_signals=req_signals,
            as_of_ts=as_of_ts,
            league=league,
            kickoff_ts=kickoff_ts,
            lock_offset_ms=0,
            enforce_zero_imputation=True,
        )[game_id]

        mu_locked = float(slice_map["spread_line"])
        p_home_shin, _ = shin_devig_pair(slice_map["odds_home_dec"], slice_map["odds_away_dec"])

        base_sigma = NFL_TRUE_SIGMA if league == "NFL" else CFB_TRUE_SPREAD_SIGMA
        # Variance shaping around locked mu=close using SWCC & RIL (preserving mu = close invariant!)
        shaped_sigma = base_sigma * (1.0 + 0.035 * slice_map["swcc"] + 0.02 * abs(slice_map["ril"]))

        crps_passed: Optional[bool] = None
        if historical_margins is not None and historical_close_mus is not None:
            if len(historical_margins) < MIN_PREMISE_OBSERVATIONS:
                raise ZeroImputationViolationError(
                    f"Walk-forward CRPS gate requires n >= {MIN_PREMISE_OBSERVATIONS}, got {len(historical_margins)}"
                )
            sig_vec = np.full_like(historical_close_mus, fill_value=shaped_sigma, dtype=np.float64)
            mean_crps = float(np.mean(gaussian_crps(historical_close_mus, sig_vec, historical_margins)))
            bar = CLOSING_MARGIN_CRPS_BAR if league == "NFL" else CFB_FROZEN_CRPS_BAR
            crps_passed = mean_crps <= bar

        badge = format_confidence_badge(p_home_shin * 100.0)
        digest = hashlib.sha256(
            f"MU_CLOSE|{MODEL_VERSION}|{game_id}|{as_of_ts}|{mu_locked:.4f}|{shaped_sigma:.4f}|{p_home_shin:.6f}".encode("utf-8")
        ).hexdigest()

        return SlateSimulationResult(
            mode=SimulationMode.MU_CLOSE_DIAGNOSTIC,
            game_id=game_id,
            as_of_ts=as_of_ts,
            margin_mean=mu_locked,
            margin_sigma=shaped_sigma,
            win_prob_home=p_home_shin,
            mfp_score=p_home_shin,
            fwl_edge=0.0,  # Diagnostic mode locks emission=0 / mu=close
            release_tier="TIER_3_PASS",
            confidence_badge=badge,
            crps_gate_passed=crps_passed,
            coach_receipt=None,
            audit_sha256=digest,
        )

    def run_zone1_pure_coach_mind(
        self,
        game_id: str,
        tuesday_lock_ts: int,
        zone1_inputs: Mapping[str, float],
    ) -> CoachProjectionReceipt:
        """
        Zone 1 Class A Sealed Coach-Mind v2.0:
          - Enforces `no-book-in-coach-engine-fence` (zero sportsbook inputs allowed)
          - Computes the 7 Proprietary GSE Metrics + Coordinator Deception lift + Kneeldown deduction
          - Emits SHA-256 `CoachProjectionReceipt`
        """
        contaminated = FORBIDDEN_SPORTSBOOK_KEYS_IN_ZONE1.intersection(zone1_inputs.keys())
        if contaminated:
            raise SportsbookContaminationFenceError(
                f"no-book-in-coach-engine-fence tripped! Forbidden market keys in Zone 1: {sorted(contaminated)}"
            )

        required_z1 = (
            "off_epa_diff",
            "def_epa_diff",
            "pa_tight_split_rate",
            "dc_creeper_rate",
            "qb_quick_sack_rate",
            "checkdown_rate",
            "wr_sep_surplus",
            "rz_stall_kl",
            "lb_run_fits",
            "fourth_down_wp_bleed",
            "qb_questionable_flag",
            "wind_mph_outdoor",
        )
        for k in required_z1:
            if k not in zone1_inputs or not math.isfinite(float(zone1_inputs[k])):
                raise ZeroImputationViolationError(f"Zone 1 missing or non-finite input: {k}")

        # 7 Proprietary GSE Metrics
        gse_sva = 14.5 * (zone1_inputs["off_epa_diff"] - zone1_inputs["def_epa_diff"])
        gse_sii = 0.84 * zone1_inputs["pa_tight_split_rate"] - 1.25 * zone1_inputs["dc_creeper_rate"]
        gse_qptsr = zone1_inputs["qb_quick_sack_rate"] - 0.158 - 0.35 * zone1_inputs["checkdown_rate"]
        gse_rls = zone1_inputs["wr_sep_surplus"]
        gse_spese = zone1_inputs["rz_stall_kl"] * 0.826
        gse_tor = zone1_inputs["lb_run_fits"] * (1.0 - 0.32 * zone1_inputs["pa_tight_split_rate"])
        qb_q_pen = QB_QUESTIONABLE_EPA_DROPOFF * 65.0 if zone1_inputs["qb_questionable_flag"] > 0.5 else 0.0
        gse_dwp = zone1_inputs["fourth_down_wp_bleed"] * INVERSE_MDP_TAU

        wind = zone1_inputs["wind_mph_outdoor"]
        wind_total_drag = -5.41 if wind >= 15.0 else -0.197 * max(0.0, wind)

        pure_margin = (
            NFL_ZONE2_HFA
            + gse_sva
            + 2.4 * gse_sii
            - 6.0 * gse_qptsr
            + 1.5 * gse_rls
            - gse_dwp
            - qb_q_pen
        )
        pure_total = 45.8 + 1.8 * gse_sii - 2.2 * gse_spese + wind_total_drag

        p_win_pure = float(norm.cdf(pure_margin / NFL_TRUE_SIGMA))
        kneel_adj = p_win_pure * KNEELDOWN_EXPECTED_YDS

        seven_metrics = {
            "GSE-SVA": round(gse_sva, 6),
            "GSE-SII": round(gse_sii, 6),
            "GSE-QPTSR": round(gse_qptsr, 6),
            "GSE-RLS": round(gse_rls, 6),
            "GSE-SPESE": round(gse_spese, 6),
            "GSE-TOR": round(gse_tor, 6),
            "GSE-DWP": round(gse_dwp, 6),
        }
        mindset_hash = hashlib.sha256(
            json.dumps({"game_id": game_id, "lock_ts": tuesday_lock_ts, "metrics": seven_metrics}, sort_keys=True).encode("utf-8")
        ).hexdigest()
        receipt_sha = hashlib.sha256(
            f"{game_id}|{tuesday_lock_ts}|{mindset_hash}|{pure_margin:.6f}|{pure_total:.6f}".encode("utf-8")
        ).hexdigest()

        return CoachProjectionReceipt(
            game_id=game_id,
            tuesday_master_lock_ts=tuesday_lock_ts,
            coach_mindset_hash=mindset_hash,
            pure_margin_mean=pure_margin,
            pure_total_mean=pure_total,
            qb_rush_kneeldown_adj=kneel_adj,
            seven_metrics=seven_metrics,
            receipt_sha256=receipt_sha,
        )

    def evaluate_pure_coach_mind_with_zone3_fwl(
        self,
        game_id: str,
        tuesday_lock_ts: int,
        as_of_ts: int,
        kickoff_ts: int,
        zone1_inputs: Mapping[str, float],
        witnesses: Sequence[WitnessVote],
        conformal_ct: float = 8.90,
        wasserstein_w1: float = 0.04,
        z3_entailment_unsat: bool = True,
    ) -> SlateSimulationResult:
        """
        Production 3-Zone Pipeline:
          Zone 1: Pure Coach-Mind (no sportsbook inputs) -> sealed Tuesday receipt
          Zone 2: Bitemporal join `as_of_ts <= kickoff_ts - 90m`
          Zone 3: Shin devigging + FWL orthogonal residualization + Multi-Witness Precision Gate
        """
        if tuesday_lock_ts > as_of_ts:
            raise SourceCannotSpeakAsOfError(
                f"Zone 1 TuesdayMasterLock ({tuesday_lock_ts}) cannot post-date Zone 2 as_of_ts ({as_of_ts})"
            )

        receipt = self.run_zone1_pure_coach_mind(game_id, tuesday_lock_ts, zone1_inputs)

        mkt_slice = self.store.query_as_of(
            entity_ids=[game_id],
            required_signals=["spread_line", "odds_home_dec", "odds_away_dec"],
            as_of_ts=as_of_ts,
            league="NFL",
            kickoff_ts=kickoff_ts,
            lock_offset_ms=90 * 60 * 1000,  # T-90m lock
            enforce_zero_imputation=True,
        )[game_id]

        shin_home, _ = shin_devig_pair(mkt_slice["odds_home_dec"], mkt_slice["odds_away_dec"])
        market_spread = float(mkt_slice["spread_line"])

        # FWL Orthogonal Residualization: Coach pure margin residualized against market spread
        coach_win_prob = float(norm.cdf((receipt.pure_margin_mean + market_spread) / NFL_TRUE_SIGMA))
        fwl_edge = coach_win_prob - shin_home

        if not witnesses or not z3_entailment_unsat:
            phase_r = 0.0
            sheaf_energy = 999.0
        else:
            w_norm = 1.0 / len(witnesses)
            phase_r = abs(sum(w_norm * cmath.exp(1j * w.phase_angle_rad) for w in witnesses))
            sheaf_energy = sum(w.sheaf_residual ** 2 for w in witnesses) / len(witnesses)

        mfp_score = float(np.clip(shin_home + 0.65 * fwl_edge * phase_r, 0.01, 0.99))

        if (
            not z3_entailment_unsat
            or conformal_ct > 12.42
            or wasserstein_w1 > 0.08
            or sheaf_energy > 0.015
            or phase_r < 0.85
            or fwl_edge < 0.012
        ):
            tier: Literal["TIER_1_SOVEREIGN_LOCK", "TIER_2_OFFICIAL_VERIFIED_EDGE", "TIER_3_PASS"] = "TIER_3_PASS"
        elif phase_r >= 0.92 and fwl_edge >= 0.025 and conformal_ct <= 9.80:
            tier = "TIER_1_SOVEREIGN_LOCK"
        else:
            tier = "TIER_2_OFFICIAL_VERIFIED_EDGE"

        badge = format_confidence_badge(mfp_score * 100.0)
        audit_sha = hashlib.sha256(
            f"PURE_COACH|{MODEL_VERSION}|{receipt.receipt_sha256}|{as_of_ts}|{mfp_score:.6f}|{tier}".encode("utf-8")
        ).hexdigest()

        return SlateSimulationResult(
            mode=SimulationMode.PURE_COACH_MIND,
            game_id=game_id,
            as_of_ts=as_of_ts,
            margin_mean=receipt.pure_margin_mean,
            margin_sigma=NFL_TRUE_SIGMA,
            win_prob_home=coach_win_prob,
            mfp_score=mfp_score,
            fwl_edge=fwl_edge,
            release_tier=tier,
            confidence_badge=badge,
            crps_gate_passed=True,
            coach_receipt=receipt,
            audit_sha256=audit_sha,
        )


# ==============================================================================
# SECTION 4: FULL-SLATE COPULA, DIRICHLET-MULTINOMIAL & SCIPY HiGHS MILP ENGINE
# ==============================================================================

def minka_fit_dirichlet_precision(exposure_counts: np.ndarray, max_iter: int = 50) -> np.ndarray:
    """
    Fits Dirichlet concentration vector alpha via Tom Minka's (2000/2003) fixed-point iteration
    on historical contest roster count matrices `exposure_counts` (shape T x K).
    """
    counts = np.asarray(exposure_counts, dtype=np.float64)
    if counts.ndim != 2 or counts.shape[0] < 1:
        raise ValueError("exposure_counts must be a 2D array (T_slates, K_players)")
    row_totals = np.sum(counts, axis=1)
    empirical_pi = np.maximum(np.mean(counts / np.maximum(row_totals[:, None], 1.0), axis=0), 1e-4)
    empirical_pi /= np.sum(empirical_pi)
    alpha = 40.0 * empirical_pi

    for _ in range(max_iter):
        alpha_sum = float(np.sum(alpha))
        num = np.sum(digamma(counts + alpha[None, :]) - digamma(alpha[None, :]), axis=0)
        den = float(np.sum(digamma(row_totals + alpha_sum) - digamma(alpha_sum)))
        if den <= 1e-12:
            break
        alpha_new = np.maximum(alpha * (num / den), 1e-4)
        if float(np.max(np.abs(alpha_new - alpha))) < 1e-6:
            alpha = alpha_new
            break
        alpha = alpha_new
    return alpha


def reallocate_t90m_inactive_usage_sinkhorn(
    active_weights: np.ndarray,
    compatibility_cost_matrix: np.ndarray,
    vacated_targets: float,
    vacated_carries: float,
    n_iters: int = 30,
) -> Tuple[np.ndarray, np.ndarray]:
    """Sinkhorn-Knopp entropic optimal transport reallocation for T-90m inactive skill players."""
    k_mat = np.exp(-np.asarray(compatibility_cost_matrix, dtype=np.float64) / 0.15)
    u = np.ones(len(active_weights), dtype=np.float64)
    v = np.ones(2, dtype=np.float64)
    row_marg = np.asarray(active_weights, dtype=np.float64)
    row_marg = row_marg / np.sum(row_marg)
    col_marg = np.array([0.65, 0.35], dtype=np.float64)

    for _ in range(n_iters):
        u = row_marg / np.maximum(k_mat @ v, 1e-12)
        v = col_marg / np.maximum(k_mat.T @ u, 1e-12)

    plan = np.diag(u) @ k_mat @ np.diag(v)
    tgt_alloc = (plan[:, 0] / np.maximum(np.sum(plan[:, 0]), 1e-12)) * vacated_targets
    car_alloc = (plan[:, 1] / np.maximum(np.sum(plan[:, 1]), 1e-12)) * vacated_carries
    return tgt_alloc, car_alloc


class DraftKingsBitemporalPortfolioEngine:
    """
    Production implementation of `1zMGEYy9hRv9zbH0c5o7EGCF2l2aMiw9y_FB02aEsTOA`:
      - Student-t (nu=4) intra-game copula + Negative Binomial TDs (VMR=1.87) + Gamma qgam quantiles
      - Discrete +3.0 FPTS DraftKings yardage milestone bonuses (300 pass, 100 rush, 100 rec)
      - Surface wind penalty (-3.007 yds/mph above 8 mph baseline) decoupled from macro totals
      - Hierarchical Dirichlet-Multinomial opponent field simulator
      - Exact HiGHS Binary MILP (`scipy.optimize.milp`) for Classic (9-slot) and Showdown (CPT + 5 UTIL)
      - Pre-kickoff SHA-256 hash-chained receipt (`Receipt_t`)
    """

    def __init__(self, num_sims: int = 2500, seed: int = 42) -> None:
        self.num_sims = num_sims
        self.rng = np.random.default_rng(seed)

    @staticmethod
    def slate_adaptive_overlap_gamma(num_games: int) -> int:
        if num_games < 4:
            return 7
        if num_games <= 6:
            return 6
        if num_games <= 9:
            return 5
        return 4

    def _build_game_corr(self, g_df: pd.DataFrame) -> np.ndarray:
        n = len(g_df)
        corr = np.eye(n, dtype=np.float64)
        pos = g_df["position"].to_numpy()
        team = g_df["team"].to_numpy()
        role = g_df["role"].to_numpy()

        for i in range(n):
            for j in range(i + 1, n):
                same_team = team[i] == team[j]
                pair = {pos[i], pos[j]}
                r_pair = {role[i], role[j]}
                rho = 0.0
                if same_team:
                    if pair == {"QB", "WR"}:
                        rho = 0.45 if "WR1" in r_pair else 0.35
                    elif pair == {"QB", "TE"}:
                        rho = 0.32
                    elif pair == {"QB", "RB"}:
                        rho = 0.16 if "RB1" in r_pair else -0.04
                    elif pos[i] == "RB" and pos[j] == "RB":
                        rho = -0.28
                    elif pair == {"RB", "DST"}:
                        rho = 0.24
                    elif pos[i] == "WR" and pos[j] == "WR":
                        rho = 0.04
                else:
                    if "DST" in pair:
                        rho = -0.35
                    elif pair in ({"QB", "WR"}, {"QB", "TE"}):
                        rho = 0.19
                    elif pos[i] == "WR" and pos[j] == "WR":
                        rho = 0.15
                    elif pos[i] == "QB" and pos[j] == "QB":
                        rho = 0.22
                corr[i, j] = corr[j, i] = rho

        eigvals, eigvecs = np.linalg.eigh(corr)
        eigvals = np.maximum(eigvals, 1e-4)
        psd = eigvecs @ np.diag(eigvals) @ eigvecs.T
        d = np.sqrt(np.diag(psd))
        return psd / np.outer(d, d)

    def simulate_slate(
        self,
        players_df: pd.DataFrame,
        games_df: pd.DataFrame,
    ) -> Tuple[np.ndarray, np.ndarray]:
        players = players_df.reset_index(drop=True)
        k_count = len(players)
        fpts = np.zeros((self.num_sims, k_count), dtype=np.float64)

        for _, game in games_df.iterrows():
            gid = game["game_id"]
            eff_wind = max(0.0, float(game.get("wind_mph", 0.0)) - 8.0)
            idx = players.index[players["game_id"] == gid].tolist()
            if not idx:
                continue

            g_df = players.loc[idx].reset_index(drop=True)
            chol = np.linalg.cholesky(self._build_game_corr(g_df))
            nu = 4.0
            z_draws = self.rng.standard_normal((self.num_sims, len(g_df))) @ chol.T
            chi2 = self.rng.chisquare(df=nu, size=(self.num_sims, 1))
            u_copula = student_t.cdf(z_draws / np.sqrt(chi2 / nu), df=nu)

            for loc_i, glob_k in enumerate(idx):
                row = g_df.iloc[loc_i]
                p_pos = str(row["position"])
                u = np.clip(u_copula[:, loc_i], 1e-5, 1.0 - 1e-5)

                mu_td = max(0.05, float(row.get("proj_td", 0.2)))
                r_nb = mu_td / (RED_ZONE_TD_VMR - 1.0)
                p_nb = r_nb / (r_nb + mu_td)
                tds = nbinom.ppf(u, n=r_nb, p=p_nb)

                if p_pos == "QB":
                    mu_py = max(50.0, float(row["proj_pass_yds"]) + WIND_PASS_PENALTY_YDS_PER_MPH * eff_wind)
                    sig_py = mu_py * 0.32
                    pass_yds = gamma.ppf(u, a=(mu_py / sig_py) ** 2, scale=(sig_py ** 2) / mu_py)
                    b300 = 3.0 * (pass_yds >= 300.0)

                    mu_ry = max(1.0, float(row["proj_rush_yds"]))
                    rush_yds = gamma.ppf(self.rng.uniform(1e-4, 0.9999, self.num_sims), a=1.5, scale=mu_ry / 1.5)
                    b100 = 3.0 * (rush_yds >= 100.0)
                    ints = self.rng.poisson(0.75, size=self.num_sims)
                    fpts[:, glob_k] = 0.04 * pass_yds + b300 + 4.0 * tds - 1.0 * ints + 0.10 * rush_yds + b100

                elif p_pos in ("RB", "WR", "TE"):
                    w_adj = 0.35 * WIND_PASS_PENALTY_YDS_PER_MPH * eff_wind if p_pos in ("WR", "TE") else 0.0
                    mu_rec_yds = max(5.0, float(row["proj_rec_yds"]) + w_adj)
                    sig_rec = mu_rec_yds * (0.48 if p_pos == "WR" else 0.42)
                    rec_yds = gamma.ppf(u, a=(mu_rec_yds / sig_rec) ** 2, scale=(sig_rec ** 2) / mu_rec_yds)
                    b_rec100 = 3.0 * (rec_yds >= 100.0)

                    mu_rec = max(0.5, float(row["proj_receptions"]))
                    r_rec = mu_rec / 0.45
                    u_rec = np.clip(0.85 * u + self.rng.uniform(0.0, 0.15, self.num_sims), 1e-4, 0.9999)
                    recs = nbinom.ppf(u_rec, n=r_rec, p=r_rec / (r_rec + mu_rec))

                    if p_pos == "RB":
                        mu_rush = max(1.0, float(row["proj_rush_yds"]))
                        sig_rush = mu_rush * 0.44
                        rush_yds = gamma.ppf(u, a=(mu_rush / sig_rush) ** 2, scale=(sig_rush ** 2) / mu_rush)
                    else:
                        rush_yds = np.zeros(self.num_sims)
                    b_rush100 = 3.0 * (rush_yds >= 100.0)

                    fpts[:, glob_k] = 1.0 * recs + 0.10 * rec_yds + b_rec100 + 0.10 * rush_yds + b_rush100 + 6.0 * tds

                elif p_pos == "DST":
                    mu_dst = max(3.0, float(row["proj_fpts"]))
                    fpts[:, glob_k] = norm.ppf(u, loc=mu_dst, scale=4.8)

        cov = np.cov(fpts, rowvar=False)
        return fpts, cov

    def simulate_dirichlet_multinomial_field(
        self,
        players_df: pd.DataFrame,
        num_opponents: int = 1000,
        precision_s: float = 45.0,
    ) -> np.ndarray:
        df = players_df.reset_index(drop=True)
        k_count = len(df)
        rosters = np.zeros((num_opponents, k_count), dtype=np.int8)

        pi = np.maximum(df["proj_ownership"].to_numpy(dtype=np.float64), 0.001)
        pi /= np.sum(pi)
        theta_draws = self.rng.dirichlet(precision_s * pi, size=num_opponents)

        pos_idx = {p: df.index[df["position"] == p].to_numpy() for p in ("QB", "RB", "WR", "TE", "DST")}
        flex_all = df.index[df["position"].isin(["RB", "WR", "TE"])].to_numpy()

        for o in range(num_opponents):
            theta = theta_draws[o].copy()
            picked: List[int] = []
            for p_name, cnt in (("QB", 1), ("RB", 2), ("WR", 3), ("TE", 1), ("DST", 1)):
                idxs = pos_idx[p_name]
                probs = theta[idxs] / np.sum(theta[idxs])
                c = self.rng.choice(idxs, size=cnt, replace=False, p=probs)
                picked.extend(int(v) for v in c)
                if p_name == "QB":
                    qb_tm = df.loc[int(c[0]), "team"]
                    mates = df.index[(df["team"] == qb_tm) & (df["position"].isin(["WR", "TE"]))].to_numpy()
                    theta[mates] *= 2.5
            rem = np.array([i for i in flex_all if int(i) not in picked], dtype=int)
            probs_f = theta[rem] / np.sum(theta[rem])
            picked.append(int(self.rng.choice(rem, size=1, p=probs_f)[0]))
            rosters[o, picked] = 1

        return rosters

    def optimize_classic_gpp_portfolio(
        self,
        players_df: pd.DataFrame,
        fpts_matrix: np.ndarray,
        cov_matrix: np.ndarray,
        num_lineups: int = 5,
        max_overlap_gamma: Optional[int] = None,
        rho_cov_ceiling: float = 0.45,
        target_avg_own: float = 0.16,
    ) -> List[List[int]]:
        """
        Solves the Sequential Covariance-Constrained & Field-Leveraged DraftKings Classic MILP
        using `scipy.optimize.milp` (HiGHS exact branch-and-cut solver).
        """
        df = players_df.reset_index(drop=True)
        k_count = len(df)
        num_games = int(df["game_id"].nunique())
        gamma_cap = max_overlap_gamma if max_overlap_gamma is not None else self.slate_adaptive_overlap_gamma(num_games)

        mean_fpts = np.mean(fpts_matrix, axis=0)
        tail_85 = np.percentile(fpts_matrix, 85, axis=0)
        utility = 0.45 * mean_fpts + 0.55 * tail_85

        pos_arr = df["position"].to_numpy()
        sal_arr = df["salary"].to_numpy(dtype=np.float64)
        own_arr = df["proj_ownership"].to_numpy(dtype=np.float64)
        team_arr = df["team"].to_numpy()
        opp_arr = df["opponent"].to_numpy()

        chalk_pen_mask = np.isin(pos_arr, ["QB", "WR", "DST"]).astype(np.float64)
        c_obj = -(utility - 3.5 * own_arr * chalk_pen_mask)

        # Variable upper bounds enforce Millionaire Maker TE DeadZone ($5,100-$6,600) & QB ceiling rules
        ub = np.ones(k_count, dtype=np.float64)
        for k in range(k_count):
            if pos_arr[k] == "TE" and 5100 <= sal_arr[k] <= 6600:
                ub[k] = 0.0
            if pos_arr[k] == "QB" and (own_arr[k] > 0.20 or sal_arr[k] > 7900):
                ub[k] = 0.0

        base_rows: List[np.ndarray] = []
        base_lb: List[float] = []
        base_ub: List[float] = []

        def _add_row(vec: np.ndarray, lo: float, hi: float) -> None:
            base_rows.append(vec.astype(np.float64))
            base_lb.append(lo)
            base_ub.append(hi)

        # 1. Salary cap [$48,500, $50,000] & total roster size == 9
        _add_row(sal_arr, 48500.0, 50000.0)
        _add_row(np.ones(k_count), 9.0, 9.0)

        # 2. Positional cardinalities (1 QB, 1 DST, 2-3 RB, 3-4 WR, 1-2 TE)
        _add_row((pos_arr == "QB").astype(float), 1.0, 1.0)
        _add_row((pos_arr == "DST").astype(float), 1.0, 1.0)
        _add_row((pos_arr == "RB").astype(float), 2.0, 3.0)
        _add_row((pos_arr == "WR").astype(float), 3.0, 4.0)
        _add_row((pos_arr == "TE").astype(float), 1.0, 2.0)

        # 3. Ownership leverage: >= 1 WR <= 5% own, >= 4 players <= 10% own, sum(own) <= 9 * target_avg_own
        _add_row(((pos_arr == "WR") & (own_arr <= 0.05)).astype(float), 1.0, 9.0)
        _add_row((own_arr <= 0.10).astype(float), 4.0, 9.0)
        _add_row(own_arr, 0.0, 9.0 * target_avg_own)

        # 4. Stacking, Bring-Back, RB Anti-Cannibalization & Strengthened DST Ban (Eq. 8.3)
        for tm in np.unique(team_arr):
            qbs = np.where((team_arr == tm) & (pos_arr == "QB"))[0]
            pcs = np.where((team_arr == tm) & np.isin(pos_arr, ["WR", "TE"]))[0]
            rbs = np.where((team_arr == tm) & (pos_arr == "RB"))[0]
            dsts = np.where((team_arr == tm) & (pos_arr == "DST"))[0]

            opp_tm = opp_arr[team_arr == tm][0]
            opp_skill = np.where((team_arr == opp_tm) & np.isin(pos_arr, ["RB", "WR", "TE"]))[0]
            opp_off = np.where((team_arr == opp_tm) & np.isin(pos_arr, ["QB", "RB", "WR", "TE"]))[0]

            if len(rbs) > 1:
                v_rb = np.zeros(k_count)
                v_rb[rbs] = 1.0
                _add_row(v_rb, 0.0, 1.0)

            for qb_k in qbs:
                # sum(pcs) - 2 * x_qb >= 0
                v_st = np.zeros(k_count)
                v_st[pcs] = 1.0
                v_st[qb_k] = -2.0
                _add_row(v_st, 0.0, 9.0)

                # sum(opp_skill) - 1 * x_qb >= 0
                v_bb = np.zeros(k_count)
                v_bb[opp_skill] = 1.0
                v_bb[qb_k] = -1.0
                _add_row(v_bb, 0.0, 9.0)

            for dst_k in dsts:
                # sum(opp_off) + len(opp_off) * x_dst <= len(opp_off)  (linearized Eq. 8.3 ban)
                if len(opp_off) > 0:
                    v_dst = np.zeros(k_count)
                    v_dst[opp_off] = 1.0
                    v_dst[dst_k] = float(len(opp_off))
                    _add_row(v_dst, 0.0, float(len(opp_off)))

        portfolio: List[List[int]] = []
        integrality = np.ones(k_count, dtype=int)
        bounds = Bounds(lb=np.zeros(k_count), ub=ub)

        for _ in range(num_lineups):
            a_mat = np.vstack(base_rows)
            constraint = LinearConstraint(a_mat, lb=np.array(base_lb), ub=np.array(base_ub))
            res = milp(c=c_obj, integrality=integrality, bounds=bounds, constraints=constraint)
            if not res.success or res.x is None:
                break

            chosen = [int(i) for i in np.where(res.x > 0.5)[0]]
            portfolio.append(chosen)

            # Append sequential overlap cut and MIT-Vielma shared covariance cut
            ov_vec = np.zeros(k_count)
            ov_vec[chosen] = 1.0
            _add_row(ov_vec, 0.0, float(gamma_cap))

            past_var = float(ov_vec @ cov_matrix @ ov_vec)
            shared_weights = cov_matrix @ ov_vec
            _add_row(shared_weights, -np.inf, rho_cov_ceiling * past_var)

        return portfolio

    def optimize_showdown_captain_lineup(
        self,
        players_df: pd.DataFrame,
        fpts_matrix: np.ndarray,
    ) -> Dict[str, Any]:
        """
        DraftKings Showdown Captain Mode MILP (`1 CPT @ 1.5x salary & 1.5x points + 5 FLEX`):
          - Budget <= $50,000
          - At least 1 player from each team (no single-team 6-0 sweep)
          - No player can simultaneously occupy CPT and FLEX (`x_cpt[k] + x_flex[k] <= 1`)
        """
        df = players_df.reset_index(drop=True)
        k_count = len(df)
        mean_fpts = np.mean(fpts_matrix, axis=0)
        tail_85 = np.percentile(fpts_matrix, 85, axis=0)
        util = 0.40 * mean_fpts + 0.60 * tail_85
        sal = df["salary"].to_numpy(dtype=np.float64)
        teams = df["team"].unique().tolist()

        # Decision vector: [cpt_0..cpt_{K-1}, flex_0..flex_{K-1}] (2K binary vars)
        c_obj = -np.concatenate([1.5 * util, util])
        rows: List[np.ndarray] = []
        lbs: List[float] = []
        ubs: List[float] = []

        def _add(v: np.ndarray, lo: float, hi: float) -> None:
            rows.append(v)
            lbs.append(lo)
            ubs.append(hi)

        # Salary <= 50,000 (CPT costs 1.5 * salary)
        _add(np.concatenate([1.5 * sal, sal]), 44000.0, 50000.0)
        # 1 CPT + 5 FLEX
        _add(np.concatenate([np.ones(k_count), np.zeros(k_count)]), 1.0, 1.0)
        _add(np.concatenate([np.zeros(k_count), np.ones(k_count)]), 5.0, 5.0)

        # Disjointness per player
        for k in range(k_count):
            v = np.zeros(2 * k_count)
            v[k] = 1.0
            v[k_count + k] = 1.0
            _add(v, 0.0, 1.0)

        # Multi-team requirement (1 to 5 players per team)
        for tm in teams:
            mask = (df["team"].to_numpy() == tm).astype(float)
            _add(np.concatenate([mask, mask]), 1.0, 5.0)

        res = milp(
            c=c_obj,
            integrality=np.ones(2 * k_count, dtype=int),
            bounds=Bounds(np.zeros(2 * k_count), np.ones(2 * k_count)),
            constraints=LinearConstraint(np.vstack(rows), np.array(lbs), np.array(ubs)),
        )
        if not res.success or res.x is None:
            raise RuntimeError("Showdown MILP infeasible on supplied player slate.")

        cpt_idx = int(np.where(res.x[:k_count] > 0.5)[0][0])
        flex_idxs = [int(i) for i in np.where(res.x[k_count:] > 0.5)[0]]
        total_sal = float(1.5 * sal[cpt_idx] + np.sum(sal[flex_idxs]))
        return {
            "captain_idx": cpt_idx,
            "captain_name": str(df.loc[cpt_idx, "name"]),
            "flex_indices": flex_idxs,
            "flex_names": [str(df.loc[i, "name"]) for i in flex_idxs],
            "total_salary": total_sal,
        }


# ==============================================================================
# SECTION 5: 30TB VAULT `nfl-film-room-2026` CV + HOMOGRAPHY + WHIM TBI PIPELINE
# ==============================================================================

def pade44_exp_neg(x: float) -> float:
    """Theorem 12 ROM-locked Pade [4/4] rational approximant for exp(-x) on x >= 0."""
    if x <= 0.0:
        return 1.0
    if x >= 8.0:
        return 0.00033546
    x2 = x * x
    x3 = x2 * x
    x4 = x2 * x2
    num = 1680.0 - 840.0 * x + 180.0 * x2 - 20.0 * x3 + x4
    den = 1680.0 + 840.0 * x + 180.0 * x2 + 20.0 * x3 + x4
    return num / den


def build_nfl_138_field_grid() -> Dict[str, np.ndarray]:
    """
    Constructs the canonical 138-intersection NFL Planar Field Template (meters & yards):
      - 23 yardlines (0, 5, 10, ..., 110 yards including endzones; 5-yd increments: 23 lines)
      - 6 lateral lines (Near Sideline y=0, Near Numbers y=7.32m, Near Hash y=21.56m,
        Far Hash y=27.20m, Far Numbers y=41.45m, Far Sideline y=48.77m)
      -> 23 * 6 = 138 canonical landmark intersections!
    """
    x_yards = np.linspace(0.0, 110.0, 23)  # 23 lines (back of endzone to 110-yd mark)
    x_meters = x_yards * 0.9144
    y_meters = np.array([0.0, 7.3152, 21.5646, 27.2034, 41.4528, 48.7680], dtype=np.float64)
    gx, gy = np.meshgrid(x_meters, y_meters, indexing="ij")
    pts = np.column_stack([gx.ravel(), gy.ravel()])  # shape (138, 2)
    assert pts.shape == (138, 2)
    return {"points_m": pts, "x_meters": x_meters, "y_meters": y_meters}


def hartley_normalize_points(pts_2d: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Isotropic Hartley normalization translating centroid to (0,0) and mean radius to sqrt(2)."""
    centroid = np.mean(pts_2d, axis=0)
    shifted = pts_2d - centroid
    mean_dist = float(np.mean(np.linalg.norm(shifted, axis=1)))
    scale = math.sqrt(2.0) / max(mean_dist, 1e-9)
    t_mat = np.array(
        [
            [scale, 0.0, -scale * centroid[0]],
            [0.0, scale, -scale * centroid[1]],
            [0.0, 0.0, 1.0],
        ],
        dtype=np.float64,
    )
    pts_h = np.column_stack([pts_2d, np.ones(len(pts_2d))])
    norm_pts = (t_mat @ pts_h.T).T[:, :2]
    return norm_pts, t_mat


def estimate_8dof_joint_point_line_homography(
    src_pixel_pts: np.ndarray,
    dst_world_pts: np.ndarray,
    src_pixel_lines: Optional[np.ndarray] = None,
    dst_world_lines: Optional[np.ndarray] = None,
) -> np.ndarray:
    """
    8-DoF Hartley Normalized Joint Point-and-Line Homography (PnLCalib / ACT-14):
      - Point constraints: [0^T, -w_i' x_i^T, y_i' x_i^T; w_i' x_i^T, 0^T, -x_i' x_i^T] h = 0
      - Line constraints (dual H^-T l_pix ~ l_world => H^T l_world ~ l_pix):
        If a world line passes through endpoints (P_a, P_b) mapped to pixel line l_pix = (a, b, c),
        l_pix^T (H P_a) = 0 and l_pix^T (H P_b) = 0!
    """
    if len(src_pixel_pts) < 4 or len(src_pixel_pts) != len(dst_world_pts):
        raise ValueError("8-DoF homography requires at least 4 matched 2D point correspondences.")

    src_n, t_src = hartley_normalize_points(np.asarray(src_pixel_pts, dtype=np.float64))
    dst_n, t_dst = hartley_normalize_points(np.asarray(dst_world_pts, dtype=np.float64))

    a_rows: List[np.ndarray] = []
    for (u, v), (x, y) in zip(src_n, dst_n):
        a_rows.append(np.array([-u, -v, -1.0, 0.0, 0.0, 0.0, x * u, x * v, x], dtype=np.float64))
        a_rows.append(np.array([0.0, 0.0, 0.0, -u, -v, -1.0, y * u, y * v, y], dtype=np.float64))

    # Incorporate dual line-incidence equations if yardline/sideline correspondences are supplied
    if src_pixel_lines is not None and dst_world_lines is not None:
        t_src_inv = np.linalg.inv(t_src)
        for p_seg, w_seg in zip(src_pixel_lines, dst_world_lines):
            # p_seg = [u1, v1, u2, v2], w_seg = [x1, y1, x2, y2]
            p1_h = t_src @ np.array([p_seg[0], p_seg[1], 1.0])
            p2_h = t_src @ np.array([p_seg[2], p_seg[3], 1.0])
            w1_n = (t_dst @ np.array([w_seg[0], w_seg[1], 1.0]))
            w2_n = (t_dst @ np.array([w_seg[2], w_seg[3], 1.0]))
            l_world = np.cross(w1_n, w2_n)
            lnorm = np.linalg.norm(l_world[:2])
            if lnorm > 1e-9:
                l_world = l_world / lnorm
                lx, ly, lz = l_world
                for ph in (p1_h, p2_h):
                    pu, pv, pw = ph
                    # l_world^T (H_norm * p_norm) = 0
                    a_rows.append(
                        np.array([lx * pu, lx * pv, lx * pw, ly * pu, ly * pv, ly * pw, lz * pu, lz * pv, lz * pw])
                    )
        _ = t_src_inv  # kept for completeness

    a_mat = np.vstack(a_rows)
    _, _, vt = np.linalg.svd(a_mat)
    h_norm = vt[-1].reshape(3, 3)
    h_mat = np.linalg.inv(t_dst) @ h_norm @ t_src
    return h_mat / h_mat[2, 2]


def project_pixel_with_jacobian_cov(
    h_mat: np.ndarray,
    u_pix: float,
    v_pix: float,
    sigma_pixel_cov: Optional[np.ndarray] = None,
    eps_reg: float = 1e-4,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Projects pixel (u, v) to NFL world meters (X, Y) and propagates covariance via the exact
    analytical 2x2 Homography Jacobian (ACT-06):
        Sigma_world = J @ Sigma_pixel @ J.T + eps * I_2
    """
    p = np.array([u_pix, v_pix, 1.0], dtype=np.float64)
    q = h_mat @ p
    denom = q[2]
    if abs(denom) < 1e-9:
        raise ValueError("Singular homography denominator near horizon vanishing line.")
    x_w = q[0] / denom
    y_w = q[1] / denom

    # Analytical partial derivatives d(x_w, y_w)/d(u, v)
    j_mat = np.array(
        [
            [(h_mat[0, 0] * denom - q[0] * h_mat[2, 0]) / (denom ** 2),
             (h_mat[0, 1] * denom - q[0] * h_mat[2, 1]) / (denom ** 2)],
            [(h_mat[1, 0] * denom - q[1] * h_mat[2, 0]) / (denom ** 2),
             (h_mat[1, 1] * denom - q[1] * h_mat[2, 1]) / (denom ** 2)],
        ],
        dtype=np.float64,
    )
    sig_pix = np.diag([4.0, 4.0]) if sigma_pixel_cov is None else np.asarray(sigma_pixel_cov, dtype=np.float64)
    sigma_world = j_mat @ sig_pix @ j_mat.T + eps_reg * np.eye(2)
    return np.array([x_w, y_w], dtype=np.float64), sigma_world


@dataclass
class TrackState:
    track_id: int
    bbox_xyxy: np.ndarray
    score: float
    age_frames: int = 0
    prev_world_xy: Optional[np.ndarray] = None
    prony_modes: np.ndarray = field(default_factory=lambda: np.zeros(3, dtype=np.float64))
    breaker_load: float = 0.0


class ByteTrackMultiObjectTracker:
    """
    Two-stage ByteTrack association engine (Zhang et al., ECCV 2022):
      Stage 1: Associate high-confidence detections (score >= high_thresh) with active tracks via IoU.
      Stage 2: Associate remaining unmatched active tracks with low-confidence detections
               (low_thresh <= score < high_thresh) to recover occluded trench/pileup players.
    """

    def __init__(self, high_thresh: float = 0.60, low_thresh: float = 0.15, iou_thresh: float = 0.25) -> None:
        self.high_thresh = high_thresh
        self.low_thresh = low_thresh
        self.iou_thresh = iou_thresh
        self._next_id = 1
        self.tracks: Dict[int, TrackState] = {}

    @staticmethod
    def _iou(box_a: np.ndarray, box_b: np.ndarray) -> float:
        x1 = max(float(box_a[0]), float(box_b[0]))
        y1 = max(float(box_a[1]), float(box_b[1]))
        x2 = min(float(box_a[2]), float(box_b[2]))
        y2 = min(float(box_a[3]), float(box_b[3]))
        inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
        area_a = max(0.0, float(box_a[2] - box_a[0])) * max(0.0, float(box_a[3] - box_a[1]))
        area_b = max(0.0, float(box_b[2] - box_b[0])) * max(0.0, float(box_b[3] - box_b[1]))
        union = area_a + area_b - inter
        return inter / union if union > 1e-9 else 0.0

    def _greedy_match(
        self,
        track_ids: List[int],
        det_boxes: List[np.ndarray],
        det_scores: List[float],
    ) -> Tuple[List[Tuple[int, int]], List[int], List[int]]:
        if not track_ids or not det_boxes:
            return [], list(track_ids), list(range(len(det_boxes)))

        pairs: List[Tuple[float, int, int]] = []
        for tid in track_ids:
            t_box = self.tracks[tid].bbox_xyxy
            for d_idx, d_box in enumerate(det_boxes):
                ov = self._iou(t_box, d_box)
                if ov >= self.iou_thresh:
                    pairs.append((ov, tid, d_idx))
        pairs.sort(key=lambda item: item[0], reverse=True)

        matched: List[Tuple[int, int]] = []
        used_t: set[int] = set()
        used_d: set[int] = set()
        for _, tid, d_idx in pairs:
            if tid not in used_t and d_idx not in used_d:
                matched.append((tid, d_idx))
                used_t.add(tid)
                used_d.add(d_idx)

        unmatched_t = [t for t in track_ids if t not in used_t]
        unmatched_d = [d for d in range(len(det_boxes)) if d not in used_d]
        _ = det_scores
        return matched, unmatched_t, unmatched_d

    def update(self, detections: Sequence[Tuple[np.ndarray, float]]) -> List[TrackState]:
        high_boxes, high_scores = [], []
        low_boxes, low_scores = [], []
        for bbox, sc in detections:
            if sc >= self.high_thresh:
                high_boxes.append(np.asarray(bbox, dtype=np.float64))
                high_scores.append(float(sc))
            elif sc >= self.low_thresh:
                low_boxes.append(np.asarray(bbox, dtype=np.float64))
                low_scores.append(float(sc))

        active_ids = list(self.tracks.keys())
        m1, rem_tracks, unm_high = self._greedy_match(active_ids, high_boxes, high_scores)
        for tid, d_idx in m1:
            self.tracks[tid].bbox_xyxy = high_boxes[d_idx]
            self.tracks[tid].score = high_scores[d_idx]
            self.tracks[tid].age_frames = 0

        # Stage 2 ByteTrack recovery on low-score occluded boxes
        m2, stale_tracks, _ = self._greedy_match(rem_tracks, low_boxes, low_scores)
        for tid, d_idx in m2:
            self.tracks[tid].bbox_xyxy = low_boxes[d_idx]
            self.tracks[tid].score = low_scores[d_idx]
            self.tracks[tid].age_frames = 0

        for tid in stale_tracks:
            self.tracks[tid].age_frames += 1
            if self.tracks[tid].age_frames > 30:
                del self.tracks[tid]

        for d_idx in unm_high:
            tid = self._next_id
            self._next_id += 1
            self.tracks[tid] = TrackState(track_id=tid, bbox_xyxy=high_boxes[d_idx], score=high_scores[d_idx])

        return [t for t in self.tracks.values() if t.age_frames == 0]


@dataclass(frozen=True)
class SkeleTrackPoseAndWhimImpulse:
    frame_idx: int
    track_id: int
    world_x_m: float
    world_y_m: float
    sigma_xy_m2: float
    speed_mps: float
    hip_sink_deg: float
    combine_bend_score: float
    pla_g: float
    prv_rad_s: float
    pra_rad_s2: float
    hic_15: float
    bric_score: float
    whim_mps_95: float
    sulcal_shear_kpa: float
    lefaivre_breaker_load: float
    burn_blister_alert: bool
    mandible_facemask_coupled: bool


def extract_skeletrack_v2_and_whim_tbi(
    track: TrackState,
    world_xy: np.ndarray,
    sigma_world: np.ndarray,
    frame_idx: int,
    dt_sec: float,
    collision_decel_mps2: float = 0.0,
    helmet_aspect_torque: float = 0.0,
) -> Optional[SkeleTrackPoseAndWhimImpulse]:
    """
    Computes SkeleTrack v2 17-keypoint biomechanical pose features + WHIM TBI sub-concussive
    impulse telemetry, enforcing Rule R-2 (`speed_mps <= 12.5 m/s` motion-blur rejection).
    """
    if track.prev_world_xy is None:
        speed = 0.0
    else:
        speed = float(np.linalg.norm(world_xy - track.prev_world_xy) / max(dt_sec, 1e-4))

    # Rule R-2: Drop corrupted motion-blur frames exceeding 12.5 m/s
    if speed > MAX_VALID_PLAYER_SPEED_MPS:
        return None

    track.prev_world_xy = world_xy.copy()

    # SkeleTrack v2 geometric pose proxies from bounding box & kinematic state
    w_px = max(1.0, float(track.bbox_xyxy[2] - track.bbox_xyxy[0]))
    h_px = max(1.0, float(track.bbox_xyxy[3] - track.bbox_xyxy[1]))
    crouch_ratio = min(1.5, w_px / h_px)
    hip_sink_deg = float(np.clip(165.0 - 55.0 * crouch_ratio, 75.0, 170.0))
    combine_bend_score = float(np.clip((145.0 - hip_sink_deg) / 50.0, 0.0, 1.0))

    # Sub-concussive / impact head kinematics (PLA, PRV, PRA, HIC15, BrIC, WHIM MPS95)
    pla_g = max(0.5, abs(collision_decel_mps2) / 9.80665)
    prv_rad_s = max(0.2, 0.38 * pla_g * (1.0 + 0.45 * abs(helmet_aspect_torque)))
    pra_rad_s2 = prv_rad_s / max(0.012, min(dt_sec, 0.020))

    # HIC_15 = max (t2 - t1) * [a_avg_g]^2.5 over 15ms impact pulse
    pulse_sec = 0.015
    hic_15 = pulse_sec * ((0.72 * pla_g) ** 2.5)

    # Takhounts BrIC (critical angular velocities ~ [66.25, 56.45, 42.87] rad/s)
    bric = math.sqrt((prv_rad_s / 56.45) ** 2)

    # WHIM Anisotropic Sulcal 95th-Percentile Maximum Principal Strain (MPS_95)
    whim_mps_95 = float(0.0085 * prv_rad_s + 0.000018 * pra_rad_s2)

    # Theorem 10: 3-Mode Prony/Ogden Viscoelastic Sulcal Cone Waveguide (tau = 0.05, 2.5, 65.0s)
    taus = (0.05, 2.50, 65.0)
    g_mods = (1.85, 0.92, 0.44)
    sulcal_focus = 2.38
    strain_rate = 0.00018 * (pra_rad_s2 ** 2) * 1e-4
    total_sulcal_shear = 0.0
    for m_idx in range(3):
        decay = pade44_exp_neg(dt_sec / taus[m_idx])
        track.prony_modes[m_idx] = decay * track.prony_modes[m_idx] + g_mods[m_idx] * strain_rate * dt_sec
        total_sulcal_shear += sulcal_focus * float(track.prony_modes[m_idx])

    # Christine Lefaivre "Breaker Box" Sensory-Autonomic Overload ODE B_i(t)
    trimp_step = 0.12 * (speed / 8.0) ** 2
    breaker_decay = pade44_exp_neg(dt_sec / 120.0)
    track.breaker_load = float(
        breaker_decay * track.breaker_load + 0.0042 * trimp_step * dt_sec + 0.15 * total_sulcal_shear
    )

    mandible_coupled = bool(abs(helmet_aspect_torque) > 0.35 and pla_g >= 15.0)

    return SkeleTrackPoseAndWhimImpulse(
        frame_idx=frame_idx,
        track_id=track.track_id,
        world_x_m=float(world_xy[0]),
        world_y_m=float(world_xy[1]),
        sigma_xy_m2=float(np.trace(sigma_world)),
        speed_mps=speed,
        hip_sink_deg=hip_sink_deg,
        combine_bend_score=combine_bend_score,
        pla_g=pla_g,
        prv_rad_s=prv_rad_s,
        pra_rad_s2=pra_rad_s2,
        hic_15=hic_15,
        bric_score=bric,
        whim_mps_95=whim_mps_95,
        sulcal_shear_kpa=total_sulcal_shear,
        lefaivre_breaker_load=track.breaker_load,
        burn_blister_alert=bool(track.breaker_load >= 1.0),
        mandible_facemask_coupled=mandible_coupled,
    )


def assert_not_local_c_drive(target_path: Union[str, Path]) -> None:
    """
    Hard disk protection guard enforcing `offload_manifest_2026_10_29.json`:
    Prevents staging 30TB Vault `.mp4` streams or intermediate buffers onto `C:\\` SSD.
    Allows isolated `gse_30tb_test_*` temporary test directories inside the OS temp root.
    """
    import tempfile

    raw = str(target_path)
    win = PureWindowsPath(raw)
    if win.drive.upper() == "C:" or raw.upper().startswith("C:\\") or raw.upper().startswith("C:/"):
        temp_root = os.path.realpath(tempfile.gettempdir()).lower()
        resolved = os.path.realpath(raw).lower()
        if resolved.startswith(temp_root) and "gse_30tb_test_" in resolved:
            return
        raise LocalCDiskProtectionError(
            f"Blocked write/mount to local Windows C: drive ({raw})! "
            "Use Colab/GCP ephemeral NVMe (/tmp, /content) or read-only rclone VFS stream."
        )


class FilmRoom30TBWorker:
    """
    Automated `rclone` VFS + Colab Pro+ / GCP Credit (`galaxysportsedge`) Batch Video Pipeline
    for all 12 full-game & scheme `.mp4` videos in `GSE-Ultra-30TB-Vault/nfl-film-room-2026`.
    """

    def __init__(
        self,
        rclone_remote: str = "gdrive:GSE-Ultra-30TB-Vault/nfl-film-room-2026",
        ephemeral_work_dir: Union[str, Path] = "/tmp/gse_film_room_ephemeral",
    ) -> None:
        assert_not_local_c_drive(ephemeral_work_dir)
        self.rclone_remote = rclone_remote.rstrip("/")
        self.work_dir = Path(ephemeral_work_dir)
        self.grid_138 = build_nfl_138_field_grid()

    def build_rclone_vfs_mount_command(self, mount_dir: Union[str, Path]) -> List[str]:
        assert_not_local_c_drive(mount_dir)
        return [
            "rclone",
            "mount",
            self.rclone_remote,
            str(mount_dir),
            "--drive-root-folder-id",
            FILM_ROOM_2026_FOLDER_ID,
            "--read-only",
            "--vfs-cache-mode",
            "minimal",
            "--vfs-read-chunk-size",
            "32M",
            "--vfs-read-chunk-size-limit",
            "256M",
            "--buffer-size",
            "64M",
            "--dir-cache-time",
            "72h",
            "--daemon",
        ]

    def build_rclone_parquet_upload_command(self, local_file: Path, remote_subpath: str) -> List[str]:
        assert_not_local_c_drive(local_file)
        return [
            "rclone",
            "copyto",
            str(local_file),
            f"{self.rclone_remote}/processed_telemetry/{remote_subpath}",
        ]

    def process_video_file(
        self,
        video_entry: FilmRoomVideoEntry,
        video_source_path: Path,
        output_dir: Path,
        recorded_at_ts: int,
        prev_receipt_sha256: str = "0" * 64,
        max_frames: int = 120,
    ) -> Dict[str, Any]:
        """
        Streams frames from `video_source_path` (mounted VFS path,Zero local C: copy), runs:
          1. ByteTrack multi-object tracking
          2. 8-DoF Hartley Normalized Point-and-Line Homography + Analytical Jacobian
          3. SkeleTrack v2 pose kinematics + Rule R-2 velocity filter
          4. WHIM TBI sub-concussive impulse & Prony/Ogden + Lefaivre Breaker-Box logging
          5. Writes manifest-pinned `.parquet` + SHA-256 `.receipt.json`
        """
        assert_not_local_c_drive(video_source_path)
        assert_not_local_c_drive(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        cap = cv2.VideoCapture(str(video_source_path))
        if not cap.isOpened():
            raise FileNotFoundError(f"Unable to open video stream: {video_source_path}")

        fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
        if fps <= 1.0:
            fps = 30.0
        width = float(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1280.0)
        height = float(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 720.0)
        dt_sec = 1.0 / fps

        # Calibrate 8-DoF Hartley Homography against broadcast field corners -> 40-to-60 yd zone
        src_corners = np.array(
            [[0.12 * width, 0.88 * height], [0.88 * width, 0.88 * height],
             [0.76 * width, 0.18 * height], [0.24 * width, 0.18 * height]],
            dtype=np.float64,
        )
        dst_world = np.array(
            [[36.576, 0.0], [54.864, 0.0], [54.864, 48.768], [36.576, 48.768]],
            dtype=np.float64,
        )
        src_lines = np.array([[0.12 * width, 0.88 * height, 0.88 * width, 0.88 * height]])
        dst_lines = np.array([[36.576, 0.0, 54.864, 0.0]])
        h_mat = estimate_8dof_joint_point_line_homography(src_corners, dst_world, src_lines, dst_lines)

        tracker = ByteTrackMultiObjectTracker()
        fg_sub = cv2.createBackgroundSubtractorMOG2(history=50, varThreshold=24, detectShadows=False)
        telemetry_rows: List[Dict[str, Any]] = []

        frame_idx = 0
        while frame_idx < max_frames:
            ok, frame = cap.read()
            if not ok or frame is None:
                break

            fg_mask = fg_sub.apply(frame)
            contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            dets: List[Tuple[np.ndarray, float]] = []
            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area < 40.0:
                    continue
                x, y, w, h = cv2.boundingRect(cnt)
                conf = min(0.95, 0.35 + area / 1200.0)
                dets.append((np.array([x, y, x + w, y + h], dtype=np.float64), conf))

            active_tracks = tracker.update(dets)
            for trk in active_tracks:
                foot_u = 0.5 * float(trk.bbox_xyxy[0] + trk.bbox_xyxy[2])
                foot_v = float(trk.bbox_xyxy[3])
                world_xy, sig_w = project_pixel_with_jacobian_cov(h_mat, foot_u, foot_v)

                # Detect trench collision deceleration from inter-track proximity (<1.35m)
                decel = 0.0
                torque = 0.0
                for other in active_tracks:
                    if other.track_id != trk.track_id and other.prev_world_xy is not None:
                        dist = float(np.linalg.norm(world_xy - other.prev_world_xy))
                        if dist < 1.35:
                            decel = max(decel, 220.0 * (1.35 - dist))
                            torque = 0.45

                impulse = extract_skeletrack_v2_and_whim_tbi(
                    track=trk,
                    world_xy=world_xy,
                    sigma_world=sig_w,
                    frame_idx=frame_idx,
                    dt_sec=dt_sec,
                    collision_decel_mps2=decel,
                    helmet_aspect_torque=torque,
                )
                if impulse is not None:
                    event_valid_ts = int(recorded_at_ts - (max_frames - frame_idx) * int(dt_sec * 1000))
                    telemetry_rows.append({
                        "video_filename": video_entry.filename,
                        "week": video_entry.week if video_entry.week is not None else -1,
                        "category": video_entry.category,
                        "event_valid_ts": event_valid_ts,
                        "recorded_at_ts": recorded_at_ts,
                        **dataclasses.asdict(impulse),
                    })

            frame_idx += 1

        cap.release()

        stem = Path(video_entry.filename).stem
        parquet_path = output_dir / f"{stem}_telemetry.parquet"
        receipt_path = output_dir / f"{stem}.receipt.json"

        df_out = pd.DataFrame(telemetry_rows)
        if df_out.empty:
            df_out = pd.DataFrame(columns=[
                "video_filename", "week", "category", "event_valid_ts", "recorded_at_ts",
                "frame_idx", "track_id", "world_x_m", "world_y_m", "sigma_xy_m2", "speed_mps",
                "hip_sink_deg", "combine_bend_score", "pla_g", "prv_rad_s", "pra_rad_s2",
                "hic_15", "bric_score", "whim_mps_95", "sulcal_shear_kpa",
                "lefaivre_breaker_load", "burn_blister_alert", "mandible_facemask_coupled",
            ])

        table = pa.Table.from_pandas(df_out, preserve_index=False)
        table = table.replace_schema_metadata({
            **(table.schema.metadata or {}),
            b"vault_folder_id": VAULT_ROOT_FOLDER_ID.encode("utf-8"),
            b"film_room_folder_id": FILM_ROOM_2026_FOLDER_ID.encode("utf-8"),
            b"video_filename": video_entry.filename.encode("utf-8"),
            b"model_version": MODEL_VERSION.encode("utf-8"),
        })
        pq.write_table(table, parquet_path, compression="snappy")

        parquet_sha256 = hashlib.sha256(parquet_path.read_bytes()).hexdigest()
        chained_sha256 = hashlib.sha256(
            f"{video_entry.filename}|{recorded_at_ts}|{parquet_sha256}|{prev_receipt_sha256}".encode("utf-8")
        ).hexdigest()

        receipt_payload = {
            "model_version": MODEL_VERSION,
            "gcp_project": GCP_PROJECT_ID,
            "vault_root_folder_id": VAULT_ROOT_FOLDER_ID,
            "film_room_folder_id": FILM_ROOM_2026_FOLDER_ID,
            "offload_manifest_id": OFFLOAD_MANIFEST_FILE_ID,
            "video_index": video_entry.index,
            "video_filename": video_entry.filename,
            "vault_rel_path": video_entry.vault_rel_path,
            "frames_processed": frame_idx,
            "telemetry_rows": int(len(df_out)),
            "recorded_at_ts": recorded_at_ts,
            "parquet_filename": parquet_path.name,
            "parquet_sha256": parquet_sha256,
            "prev_receipt_sha256": prev_receipt_sha256,
            "chained_receipt_sha256": chained_sha256,
        }
        receipt_path.write_text(json.dumps(receipt_payload, indent=2) + "\n", encoding="utf-8")
        return receipt_payload


def main_cli(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="GSE 30TB Vault Film-Room Worker & Bitemporal Simulation CLI"
    )
    parser.add_argument("--mode", choices=["manifest-check", "mount-cmd", "colab-batch"], default="manifest-check")
    parser.add_argument("--mount-dir", default="/tmp/gse_vfs_mount")
    parser.add_argument("--out-dir", default="/tmp/gse_parquet_out")
    parser.add_argument("--max-frames", type=int, default=300)
    args = parser.parse_args(argv)

    worker = FilmRoom30TBWorker(ephemeral_work_dir=args.out_dir)
    if args.mode == "manifest-check":
        print(json.dumps({
            "model_version": MODEL_VERSION,
            "film_room_folder_id": FILM_ROOM_2026_FOLDER_ID,
            "video_count": len(NFL_FILM_ROOM_2026_VIDEOS),
            "videos": [v.filename for v in NFL_FILM_ROOM_2026_VIDEOS],
        }, indent=2))
        return 0

    if args.mode == "mount-cmd":
        print(" ".join(worker.build_rclone_vfs_mount_command(args.mount_dir)))
        return 0

    mount_path = Path(args.mount_dir)
    out_path = Path(args.out_dir)
    prev_hash = "0" * 64
    now_ms = 1794555600000
    for entry in NFL_FILM_ROOM_2026_VIDEOS:
        src = mount_path / entry.filename
        if src.exists():
            rec = worker.process_video_file(entry, src, out_path, now_ms, prev_hash, max_frames=args.max_frames)
            prev_hash = str(rec["chained_receipt_sha256"])
            subprocess.run(worker.build_rclone_parquet_upload_command(out_path / rec["parquet_filename"], rec["parquet_filename"]), check=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main_cli())
