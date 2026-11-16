"""Brokerless durable microtask coordinator, fencing ledger, and trust scorer.

Uses pure lowercase snake_case SQL identifiers compatible with PostgreSQL
(`SELECT ... FOR UPDATE SKIP LOCKED`) and SQLite/in-memory adapters so local
unit tests and distributed fleet runners share exact leasing, fencing token,
canary dual-dispatch, and three-factor weighting semantics.
"""

from __future__ import annotations

import json
import math
import sqlite3
import threading
import uuid
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from gse_engine.fabric.invariants import (
    check_canary_parity,
    compute_result_digest,
    verify_microtask_result_invariants,
)
from gse_engine.fabric.philox import fnv1a_32_utf8

TaskType = Literal[
    "MONTE_CARLO_SLATE",
    "CRPS_WALK_FORWARD",
    "COPULA_STRESS",
    "SINKHORN_CALIBRATION",
    "FOUNDRY_EXTRACTION",
]
TaskStatus = Literal[
    "PENDING",
    "LEASED",
    "COMPLETED",
    "VERIFIED",
    "QUARANTINED",
    "DEAD_LETTER",
]
RuntimeKind = Literal[
    "python_cuda",
    "python_cpu",
    "ts_webworker",
    "ts_webgpu",
    "llm_foundry",
]

SpotCheckOracle = Callable[[str, Mapping[str, Any], int], dict[str, Any]]


@dataclass(frozen=True, slots=True)
class WorkerNodeRecord:
    """Registered compute worker node and live Beta-Bernoulli reputation state."""

    node_id: str
    runtime_kind: str
    throughput_units_per_sec: float
    trust_score: float
    trust_alpha: float
    trust_beta: float
    staleness_lag: int
    load_factor: float
    quarantined: bool
    telemetry_json: str


@dataclass(frozen=True, slots=True)
class MicrotaskSliceRecord:
    """Durable microtask slice with strict monotonic BIGINT fencing token."""

    task_id: str
    campaign_id: str
    island_id: str
    task_type: str
    payload_json: str
    deterministic_seed: int
    priority: int
    status: str
    fencing_token: int
    lease_expires_at: int | None
    attempt_count: int
    max_attempts: int
    is_canary: bool
    canary_group_id: str | None
    leased_by_node_id: str | None
    slice_units: int
    epoch: int
    result_json: str | None
    result_digest: str | None
    result_weight: float


@dataclass(frozen=True, slots=True)
class SubmissionReceipt:
    """Coordinator response to a worker submitting a microtask result."""

    accepted: bool
    task_id: str
    status: str
    reason: str
    fencing_token: int
    result_weight: float
    worker_trust_score: float
    quarantined_nodes: tuple[str, ...] = ()


def generate_postgres_ddl_and_claim_sql() -> dict[str, str]:
    """Emit PostgreSQL DDL and FOR UPDATE SKIP LOCKED claim SQL (snake_case)."""
    ddl = """
CREATE TABLE IF NOT EXISTS gse_worker_nodes (
    node_id TEXT PRIMARY KEY,
    runtime_kind TEXT NOT NULL,
    throughput_units_per_sec DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    trust_score DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    trust_alpha DOUBLE PRECISION NOT NULL DEFAULT 8.5,
    trust_beta DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    staleness_lag INTEGER NOT NULL DEFAULT 0,
    load_factor DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    quarantined BOOLEAN NOT NULL DEFAULT FALSE,
    telemetry_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS gse_microtask_slices (
    task_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    island_id TEXT NOT NULL,
    task_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    deterministic_seed BIGINT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING',
    fencing_token BIGINT NOT NULL DEFAULT 0,
    lease_expires_at BIGINT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    is_canary BOOLEAN NOT NULL DEFAULT FALSE,
    canary_group_id TEXT,
    leased_by_node_id TEXT,
    slice_units INTEGER NOT NULL DEFAULT 100,
    epoch INTEGER NOT NULL DEFAULT 0,
    result_json TEXT,
    result_digest TEXT,
    result_weight DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_gse_slices_pending_priority
    ON gse_microtask_slices (status, priority, task_id);

CREATE INDEX IF NOT EXISTS idx_gse_slices_canary_group
    ON gse_microtask_slices (canary_group_id);

CREATE TABLE IF NOT EXISTS gse_fencing_clock (
    clock_id INTEGER PRIMARY KEY,
    current_token BIGINT NOT NULL DEFAULT 0
);
""".strip()

    claim_sql = """
WITH candidate AS (
    SELECT task_id
    FROM gse_microtask_slices
    WHERE status = 'PENDING'
      AND (
        canary_group_id IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM gse_microtask_slices peer
          WHERE peer.canary_group_id = gse_microtask_slices.canary_group_id
            AND peer.task_id <> gse_microtask_slices.task_id
            AND peer.leased_by_node_id = :node_id
        )
      )
    ORDER BY priority DESC, task_id ASC
    LIMIT :batch_limit
    FOR UPDATE SKIP LOCKED
)
UPDATE gse_microtask_slices
SET status = 'LEASED',
    leased_by_node_id = :node_id,
    lease_expires_at = :lease_expires_at,
    attempt_count = attempt_count + 1,
    fencing_token = :next_fencing_token,
    slice_units = :slice_units
WHERE task_id IN (SELECT task_id FROM candidate)
RETURNING *;
""".strip()
    return {"ddl": ddl, "claim_sql": claim_sql}


class BrokerlessMicrotaskCoordinator:
    """Zero-broker task orchestrator with fencing tokens, adaptive sizing & trust."""

    def __init__(
        self,
        db_target: str | Path = ":memory:",
        *,
        default_canary_rate: float = 0.03,
        quarantine_trust_threshold: float = 0.35,
        spot_check_oracle: SpotCheckOracle | None = None,
    ) -> None:
        """Initialize durable coordinator database, schema, and canary oracle."""
        self._db_target = str(db_target)
        if not (0.0 <= default_canary_rate <= 1.0):
            raise ValueError("default_canary_rate must lie inside [0, 1]")
        self.default_canary_rate = float(default_canary_rate)
        self.quarantine_trust_threshold = float(quarantine_trust_threshold)
        self._oracle = spot_check_oracle
        self._lock = threading.RLock()
        if self._db_target != ":memory:" and not self._db_target.startswith("postgresql"):
            Path(self._db_target).parent.mkdir(parents=True, exist_ok=True)
        if self._db_target.startswith("postgresql"):
            raise ValueError(
                "Use generate_postgres_ddl_and_claim_sql() with SQLAlchemy for live Postgres "
                "or pass a SQLite path / ':memory:' for local coordinator storage."
            )
        self._conn = sqlite3.connect(self._db_target, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        if self._db_target != ":memory:":
            self._conn.execute("PRAGMA journal_mode=WAL;")
        self._init_schema()

    def close(self) -> None:
        """Close underlying database connection cleanly."""
        with self._lock:
            self._conn.close()

    def _init_schema(self) -> None:
        with self._lock:
            self._conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS gse_worker_nodes (
                    node_id TEXT PRIMARY KEY,
                    runtime_kind TEXT NOT NULL,
                    throughput_units_per_sec REAL NOT NULL DEFAULT 100.0,
                    trust_score REAL NOT NULL DEFAULT 0.85,
                    trust_alpha REAL NOT NULL DEFAULT 8.5,
                    trust_beta REAL NOT NULL DEFAULT 1.5,
                    staleness_lag INTEGER NOT NULL DEFAULT 0,
                    load_factor REAL NOT NULL DEFAULT 0.2,
                    quarantined INTEGER NOT NULL DEFAULT 0,
                    telemetry_json TEXT NOT NULL DEFAULT '{}'
                );

                CREATE TABLE IF NOT EXISTS gse_microtask_slices (
                    task_id TEXT PRIMARY KEY,
                    campaign_id TEXT NOT NULL,
                    island_id TEXT NOT NULL,
                    task_type TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    deterministic_seed INTEGER NOT NULL,
                    priority INTEGER NOT NULL DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'PENDING',
                    fencing_token INTEGER NOT NULL DEFAULT 0,
                    lease_expires_at INTEGER,
                    attempt_count INTEGER NOT NULL DEFAULT 0,
                    max_attempts INTEGER NOT NULL DEFAULT 3,
                    is_canary INTEGER NOT NULL DEFAULT 0,
                    canary_group_id TEXT,
                    leased_by_node_id TEXT,
                    slice_units INTEGER NOT NULL DEFAULT 100,
                    epoch INTEGER NOT NULL DEFAULT 0,
                    result_json TEXT,
                    result_digest TEXT,
                    result_weight REAL NOT NULL DEFAULT 0.0
                );

                CREATE INDEX IF NOT EXISTS idx_gse_slices_pending_priority
                    ON gse_microtask_slices (status, priority, task_id);

                CREATE INDEX IF NOT EXISTS idx_gse_slices_canary_group
                    ON gse_microtask_slices (canary_group_id);

                CREATE TABLE IF NOT EXISTS gse_fencing_clock (
                    clock_id INTEGER PRIMARY KEY,
                    current_token INTEGER NOT NULL DEFAULT 0
                );
                INSERT OR IGNORE INTO gse_fencing_clock (clock_id, current_token) VALUES (1, 0);
                """
            )
            self._conn.commit()

    def _next_fencing_token_locked(self) -> int:
        self._conn.execute(
            "UPDATE gse_fencing_clock SET current_token = current_token + 1 WHERE clock_id = 1"
        )
        row = self._conn.execute(
            "SELECT current_token FROM gse_fencing_clock WHERE clock_id = 1"
        ).fetchone()
        assert row is not None
        return int(row["current_token"])

    @staticmethod
    def compute_adaptive_quantum_units(
        worker: WorkerNodeRecord,
        *,
        min_units: int = 10,
        max_units: int = 50_000,
    ) -> int:
        """Size slice dynamically to target a 3.0s to 8.0s execution window."""
        clamped_load = max(0.0, min(1.0, float(worker.load_factor)))
        target_sec = 8.0 - 5.0 * clamped_load
        raw = int(round(max(1.0, float(worker.throughput_units_per_sec)) * target_sec))
        return max(min_units, min(max_units, raw))

    @staticmethod
    def _row_to_worker(row: sqlite3.Row) -> WorkerNodeRecord:
        return WorkerNodeRecord(
            node_id=str(row["node_id"]),
            runtime_kind=str(row["runtime_kind"]),
            throughput_units_per_sec=float(row["throughput_units_per_sec"]),
            trust_score=float(row["trust_score"]),
            trust_alpha=float(row["trust_alpha"]),
            trust_beta=float(row["trust_beta"]),
            staleness_lag=int(row["staleness_lag"]),
            load_factor=float(row["load_factor"]),
            quarantined=bool(row["quarantined"]),
            telemetry_json=str(row["telemetry_json"]),
        )

    @staticmethod
    def _row_to_slice(row: sqlite3.Row) -> MicrotaskSliceRecord:
        return MicrotaskSliceRecord(
            task_id=str(row["task_id"]),
            campaign_id=str(row["campaign_id"]),
            island_id=str(row["island_id"]),
            task_type=str(row["task_type"]),
            payload_json=str(row["payload_json"]),
            deterministic_seed=int(row["deterministic_seed"]),
            priority=int(row["priority"]),
            status=str(row["status"]),
            fencing_token=int(row["fencing_token"]),
            lease_expires_at=(
                int(row["lease_expires_at"]) if row["lease_expires_at"] is not None else None
            ),
            attempt_count=int(row["attempt_count"]),
            max_attempts=int(row["max_attempts"]),
            is_canary=bool(row["is_canary"]),
            canary_group_id=(
                str(row["canary_group_id"]) if row["canary_group_id"] is not None else None
            ),
            leased_by_node_id=(
                str(row["leased_by_node_id"]) if row["leased_by_node_id"] is not None else None
            ),
            slice_units=int(row["slice_units"]),
            epoch=int(row["epoch"]),
            result_json=str(row["result_json"]) if row["result_json"] is not None else None,
            result_digest=str(row["result_digest"]) if row["result_digest"] is not None else None,
            result_weight=float(row["result_weight"]),
        )

    def register_worker(
        self,
        node_id: str,
        runtime_kind: RuntimeKind,
        *,
        initial_throughput: float = 120.0,
        load_factor: float = 0.2,
        trust_score: float = 0.85,
        telemetry: Mapping[str, Any] | None = None,
    ) -> WorkerNodeRecord:
        """Upsert a compute worker node with initial capability and reputation."""
        clamped_t = max(0.05, min(0.99, float(trust_score)))
        alpha = clamped_t * 10.0
        beta = (1.0 - clamped_t) * 10.0
        tel_s = json.dumps(dict(telemetry or {}), sort_keys=True)
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO gse_worker_nodes (
                    node_id, runtime_kind, throughput_units_per_sec, trust_score,
                    trust_alpha, trust_beta, staleness_lag, load_factor, quarantined,
                    telemetry_json
                ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, ?)
                ON CONFLICT(node_id) DO UPDATE SET
                    runtime_kind = excluded.runtime_kind,
                    load_factor = excluded.load_factor,
                    telemetry_json = excluded.telemetry_json
                """,
                (
                    node_id,
                    runtime_kind,
                    max(1.0, float(initial_throughput)),
                    clamped_t,
                    alpha,
                    beta,
                    max(0.0, min(1.0, float(load_factor))),
                    tel_s,
                ),
            )
            self._conn.commit()
            row = self._conn.execute(
                "SELECT * FROM gse_worker_nodes WHERE node_id = ?", (node_id,)
            ).fetchone()
            assert row is not None
            return self._row_to_worker(row)

    def get_worker(self, node_id: str) -> WorkerNodeRecord | None:
        """Fetch current worker node state."""
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM gse_worker_nodes WHERE node_id = ?", (node_id,)
            ).fetchone()
            return self._row_to_worker(row) if row is not None else None

    def get_slice(self, task_id: str) -> MicrotaskSliceRecord | None:
        """Fetch a single microtask slice record."""
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM gse_microtask_slices WHERE task_id = ?", (task_id,)
            ).fetchone()
            return self._row_to_slice(row) if row is not None else None

    def _should_canary_by_default(self, task_id: str, priority: int) -> bool:
        if self.default_canary_rate <= 0.0:
            return False
        bucket = (fnv1a_32_utf8(f"{task_id}:{priority}") % 10_000) / 10_000.0
        return bucket < self.default_canary_rate

    def enqueue_microtask(
        self,
        *,
        campaign_id: str,
        island_id: str,
        task_type: TaskType,
        payload: Mapping[str, Any],
        deterministic_seed: int,
        priority: int = 10,
        epoch: int = 0,
        max_attempts: int = 3,
        task_id: str | None = None,
        force_canary: bool = False,
        base_units: int = 100,
    ) -> MicrotaskSliceRecord:
        """Enqueue a microtask slice, optionally spawning a dual-dispatch canary twin."""
        primary_id = task_id or f"task-{uuid.uuid4().hex[:12]}"
        is_canary = bool(force_canary or self._should_canary_by_default(primary_id, priority))
        canary_group = f"cg-{uuid.uuid4().hex[:10]}" if is_canary else None
        payload_s = json.dumps(dict(payload), sort_keys=True)

        with self._lock:
            self._conn.execute(
                """
                INSERT INTO gse_microtask_slices (
                    task_id, campaign_id, island_id, task_type, payload_json,
                    deterministic_seed, priority, status, fencing_token,
                    max_attempts, is_canary, canary_group_id, slice_units, epoch
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, ?, ?, ?, ?)
                """,
                (
                    primary_id,
                    campaign_id,
                    island_id,
                    task_type,
                    payload_s,
                    int(deterministic_seed),
                    int(priority),
                    int(max_attempts),
                    1 if is_canary else 0,
                    canary_group,
                    int(base_units),
                    int(epoch),
                ),
            )
            if is_canary and canary_group is not None:
                twin_id = f"{primary_id}-canary"
                self._conn.execute(
                    """
                    INSERT INTO gse_microtask_slices (
                        task_id, campaign_id, island_id, task_type, payload_json,
                        deterministic_seed, priority, status, fencing_token,
                        max_attempts, is_canary, canary_group_id, slice_units, epoch
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, 1, ?, ?, ?)
                    """,
                    (
                        twin_id,
                        campaign_id,
                        island_id,
                        task_type,
                        payload_s,
                        int(deterministic_seed),
                        int(priority),
                        int(max_attempts),
                        canary_group,
                        int(base_units),
                        int(epoch),
                    ),
                )
            self._conn.commit()
            row = self._conn.execute(
                "SELECT * FROM gse_microtask_slices WHERE task_id = ?", (primary_id,)
            ).fetchone()
            assert row is not None
            return self._row_to_slice(row)

    def reap_expired_leases(self, now_ms: int) -> int:
        """Return expired leased slices to PENDING or move exhausted slices to DEAD_LETTER."""
        reaped = 0
        with self._lock:
            self._conn.execute("BEGIN IMMEDIATE")
            rows = self._conn.execute(
                """
                SELECT task_id, attempt_count, max_attempts
                FROM gse_microtask_slices
                WHERE status = 'LEASED' AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?
                """,
                (int(now_ms),),
            ).fetchall()
            for r in rows:
                next_status = (
                    "DEAD_LETTER"
                    if int(r["attempt_count"]) >= int(r["max_attempts"])
                    else "PENDING"
                )
                self._conn.execute(
                    """
                    UPDATE gse_microtask_slices
                    SET status = ?, leased_by_node_id = NULL, lease_expires_at = NULL
                    WHERE task_id = ?
                    """,
                    (next_status, str(r["task_id"])),
                )
                reaped += 1
            self._conn.commit()
        return reaped

    def claim_batch(
        self,
        node_id: str,
        now_ms: int,
        *,
        max_tasks: int = 4,
        lease_ttl_ms: int = 15_000,
    ) -> list[MicrotaskSliceRecord]:
        """Atomically claim pending microtasks with monotonic fencing tokens & quantum sizing."""
        claimed: list[MicrotaskSliceRecord] = []
        with self._lock:
            self._conn.execute("BEGIN IMMEDIATE")
            w_row = self._conn.execute(
                "SELECT * FROM gse_worker_nodes WHERE node_id = ?", (node_id,)
            ).fetchone()
            if w_row is None:
                self._conn.rollback()
                raise KeyError(f"Unregistered worker node: {node_id}")
            worker = self._row_to_worker(w_row)
            if worker.quarantined or worker.trust_score < self.quarantine_trust_threshold:
                self._conn.rollback()
                return []

            quantum = self.compute_adaptive_quantum_units(worker)
            candidates = self._conn.execute(
                """
                SELECT * FROM gse_microtask_slices
                WHERE status = 'PENDING'
                  AND (
                    canary_group_id IS NULL
                    OR NOT EXISTS (
                      SELECT 1 FROM gse_microtask_slices peer
                      WHERE peer.canary_group_id = gse_microtask_slices.canary_group_id
                        AND peer.task_id <> gse_microtask_slices.task_id
                        AND peer.leased_by_node_id = ?
                    )
                  )
                ORDER BY priority DESC, task_id ASC
                LIMIT ?
                """,
                (node_id, int(max_tasks)),
            ).fetchall()

            for c in candidates:
                tid = str(c["task_id"])
                token = self._next_fencing_token_locked()
                c_group = c["canary_group_id"]
                is_canary = int(c["is_canary"])

                # Low-trust nodes trigger automatic dynamic canary dual-dispatch inspection.
                if worker.trust_score < 0.70 and c_group is None:
                    c_group = f"cg-esc-{uuid.uuid4().hex[:8]}"
                    is_canary = 1
                    twin_id = f"{tid}-canary"
                    self._conn.execute(
                        """
                        INSERT OR IGNORE INTO gse_microtask_slices (
                            task_id, campaign_id, island_id, task_type, payload_json,
                            deterministic_seed, priority, status, fencing_token,
                            max_attempts, is_canary, canary_group_id, slice_units, epoch
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, 1, ?, ?, ?)
                        """,
                        (
                            twin_id,
                            str(c["campaign_id"]),
                            str(c["island_id"]),
                            str(c["task_type"]),
                            str(c["payload_json"]),
                            int(c["deterministic_seed"]),
                            int(c["priority"]),
                            int(c["max_attempts"]),
                            c_group,
                            quantum,
                            int(c["epoch"]),
                        ),
                    )

                self._conn.execute(
                    """
                    UPDATE gse_microtask_slices
                    SET status = 'LEASED',
                        leased_by_node_id = ?,
                        lease_expires_at = ?,
                        attempt_count = attempt_count + 1,
                        fencing_token = ?,
                        slice_units = ?,
                        is_canary = ?,
                        canary_group_id = ?
                    WHERE task_id = ? AND status = 'PENDING'
                    """,
                    (
                        node_id,
                        int(now_ms + lease_ttl_ms),
                        token,
                        quantum,
                        is_canary,
                        c_group,
                        tid,
                    ),
                )
                updated = self._conn.execute(
                    "SELECT * FROM gse_microtask_slices WHERE task_id = ?", (tid,)
                ).fetchone()
                if updated is not None and str(updated["status"]) == "LEASED":
                    claimed.append(self._row_to_slice(updated))

            self._conn.commit()
        return claimed

    def _adjust_worker_trust_locked(
        self,
        node_id: str,
        *,
        alpha_delta: float = 0.0,
        beta_delta: float = 0.0,
        new_throughput: float | None = None,
        staleness_lag: int | None = None,
    ) -> WorkerNodeRecord:
        w_row = self._conn.execute(
            "SELECT * FROM gse_worker_nodes WHERE node_id = ?", (node_id,)
        ).fetchone()
        assert w_row is not None
        alpha = max(0.5, float(w_row["trust_alpha"]) + alpha_delta)
        beta = max(0.5, float(w_row["trust_beta"]) + beta_delta)
        beta_post = alpha / (alpha + beta)
        prev_score = float(w_row["trust_score"])
        obs = 1.0 if (alpha_delta > 0.0 and beta_delta <= 0.0) else (0.0 if beta_delta > 0 else 0.5)
        ewma = 0.75 * prev_score + 0.25 * obs
        blended_trust = max(0.01, min(0.99, 0.65 * beta_post + 0.35 * ewma))
        quarantined = (
            1
            if blended_trust < self.quarantine_trust_threshold
            else int(w_row["quarantined"])
        )
        thr = float(w_row["throughput_units_per_sec"])
        if new_throughput is not None and math.isfinite(new_throughput) and new_throughput > 0.0:
            thr = 0.70 * thr + 0.30 * float(new_throughput)
        lag = int(w_row["staleness_lag"]) if staleness_lag is None else max(0, int(staleness_lag))

        self._conn.execute(
            """
            UPDATE gse_worker_nodes
            SET trust_alpha = ?, trust_beta = ?, trust_score = ?, quarantined = ?,
                throughput_units_per_sec = ?, staleness_lag = ?
            WHERE node_id = ?
            """,
            (alpha, beta, blended_trust, quarantined, thr, lag, node_id),
        )
        updated = self._conn.execute(
            "SELECT * FROM gse_worker_nodes WHERE node_id = ?", (node_id,)
        ).fetchone()
        assert updated is not None
        return self._row_to_worker(updated)

    def submit_result(
        self,
        task_id: str,
        node_id: str,
        fencing_token: int,
        result_payload: Mapping[str, Any],
        *,
        elapsed_sec: float = 4.0,
        worker_epoch: int = 0,
        current_epoch: int = 0,
        now_ms: int = 0,
        gamma: float = 0.15,
    ) -> SubmissionReceipt:
        """Verify fencing token, mathematical invariants & canary consensus, then score."""
        del now_ms
        with self._lock:
            self._conn.execute("BEGIN IMMEDIATE")
            row = self._conn.execute(
                "SELECT * FROM gse_microtask_slices WHERE task_id = ?", (task_id,)
            ).fetchone()
            if row is None:
                self._conn.rollback()
                return SubmissionReceipt(False, task_id, "MISSING", "TASK_NOT_FOUND", 0, 0.0, 0.0)

            s_rec = self._row_to_slice(row)
            w_row = self._conn.execute(
                "SELECT * FROM gse_worker_nodes WHERE node_id = ?", (node_id,)
            ).fetchone()
            w_trust = float(w_row["trust_score"]) if w_row is not None else 0.0

            # Strict fencing token & owner check blocks delayed zombie commits.
            if (
                s_rec.status != "LEASED"
                or int(fencing_token) < s_rec.fencing_token
                or int(fencing_token) != s_rec.fencing_token
                or s_rec.leased_by_node_id != node_id
            ):
                self._conn.rollback()
                return SubmissionReceipt(
                    False,
                    task_id,
                    s_rec.status,
                    "STALE_FENCING_TOKEN",
                    s_rec.fencing_token,
                    0.0,
                    w_trust,
                )

            verdict = verify_microtask_result_invariants(result_payload)
            if not verdict.ok:
                self._conn.execute(
                    """
                    UPDATE gse_microtask_slices
                    SET status = 'QUARANTINED', result_weight = 0.0
                    WHERE task_id = ?
                    """,
                    (task_id,),
                )
                w_upd = self._adjust_worker_trust_locked(node_id, beta_delta=4.0)
                if s_rec.attempt_count < s_rec.max_attempts:
                    clean_id = f"{task_id}-retry{s_rec.attempt_count}"
                    self._conn.execute(
                        """
                        INSERT OR IGNORE INTO gse_microtask_slices (
                            task_id, campaign_id, island_id, task_type, payload_json,
                            deterministic_seed, priority, status, fencing_token,
                            max_attempts, is_canary, canary_group_id, slice_units, epoch
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, 0, NULL, ?, ?)
                        """,
                        (
                            clean_id,
                            s_rec.campaign_id,
                            s_rec.island_id,
                            s_rec.task_type,
                            s_rec.payload_json,
                            s_rec.deterministic_seed,
                            s_rec.priority,
                            s_rec.max_attempts,
                            s_rec.slice_units,
                            s_rec.epoch,
                        ),
                    )
                self._conn.commit()
                q_nodes = (node_id,) if w_upd.quarantined else ()
                return SubmissionReceipt(
                    False,
                    task_id,
                    "QUARANTINED",
                    f"INVARIANT_VIOLATION:{verdict.reason}",
                    s_rec.fencing_token,
                    0.0,
                    w_upd.trust_score,
                    q_nodes,
                )

            lag = max(0, int(current_epoch) - int(worker_epoch))
            staleness_decay = math.exp(-float(gamma) * float(lag))
            measured_thr = float(s_rec.slice_units) / max(0.05, float(elapsed_sec))
            digest = compute_result_digest(result_payload, decimals=6)
            res_json = json.dumps(dict(result_payload), sort_keys=True)

            # Store provisionally as COMPLETED, then run Canary peer consensus if paired.
            canary_parity = 1.0
            final_status = "VERIFIED" if not s_rec.is_canary else "COMPLETED"
            quarantined_nodes: list[str] = []

            w_upd = self._adjust_worker_trust_locked(
                node_id,
                alpha_delta=0.4 if not s_rec.is_canary else 0.0,
                new_throughput=measured_thr,
                staleness_lag=lag,
            )
            prelim_weight = canary_parity * staleness_decay * w_upd.trust_score

            self._conn.execute(
                """
                UPDATE gse_microtask_slices
                SET status = ?, result_json = ?, result_digest = ?, result_weight = ?
                WHERE task_id = ?
                """,
                (final_status, res_json, digest, prelim_weight, task_id),
            )

            if s_rec.canary_group_id is not None:
                peers = self._conn.execute(
                    """
                    SELECT * FROM gse_microtask_slices
                    WHERE canary_group_id = ? AND task_id <> ?
                    """,
                    (s_rec.canary_group_id, task_id),
                ).fetchall()
                finished_peers = [
                    self._row_to_slice(p)
                    for p in peers
                    if p["result_json"] is not None and p["status"] in {"COMPLETED", "VERIFIED"}
                ]
                if finished_peers:
                    peer = finished_peers[0]
                    peer_payload = json.loads(peer.result_json or "{}")
                    parity_ok, _, parity_reason = check_canary_parity(result_payload, peer_payload)
                    if parity_ok:
                        w_self = self._adjust_worker_trust_locked(node_id, alpha_delta=1.5)
                        if peer.leased_by_node_id:
                            self._adjust_worker_trust_locked(
                                peer.leased_by_node_id, alpha_delta=1.5
                            )
                        self._conn.execute(
                            """
                            UPDATE gse_microtask_slices
                            SET status = 'VERIFIED'
                            WHERE task_id IN (?, ?)
                            """,
                            (task_id, peer.task_id),
                        )
                        final_status = "VERIFIED"
                        w_upd = w_self
                    else:
                        liar_ids: list[tuple[str, str]] = []
                        honest_ids: list[tuple[str, str]] = []
                        if self._oracle is not None:
                            oracle_out = self._oracle(
                                s_rec.task_type,
                                json.loads(s_rec.payload_json),
                                s_rec.deterministic_seed,
                            )
                            self_ok, _, _ = check_canary_parity(result_payload, oracle_out)
                            peer_ok, _, _ = check_canary_parity(peer_payload, oracle_out)
                            if self_ok and not peer_ok:
                                honest_ids.append((task_id, node_id))
                                liar_ids.append((peer.task_id, str(peer.leased_by_node_id or "")))
                            elif peer_ok and not self_ok:
                                honest_ids.append((peer.task_id, str(peer.leased_by_node_id or "")))
                                liar_ids.append((task_id, node_id))
                            else:
                                liar_ids.append((task_id, node_id))
                                liar_ids.append((peer.task_id, str(peer.leased_by_node_id or "")))
                        else:
                            liar_ids.append((task_id, node_id))
                            liar_ids.append((peer.task_id, str(peer.leased_by_node_id or "")))

                        for l_tid, l_nid in liar_ids:
                            self._conn.execute(
                                """
                                UPDATE gse_microtask_slices
                                SET status = 'QUARANTINED', result_weight = 0.0
                                WHERE task_id = ?
                                """,
                                (l_tid,),
                            )
                            if l_nid:
                                lw = self._adjust_worker_trust_locked(l_nid, beta_delta=4.5)
                                if lw.quarantined and l_nid not in quarantined_nodes:
                                    quarantined_nodes.append(l_nid)
                                if l_nid == node_id:
                                    w_upd = lw
                                    final_status = "QUARANTINED"
                                    prelim_weight = 0.0
                        for h_tid, h_nid in honest_ids:
                            self._conn.execute(
                                """
                                UPDATE gse_microtask_slices
                                SET status = 'VERIFIED'
                                WHERE task_id = ?
                                """,
                                (h_tid,),
                            )
                            if h_nid:
                                hw = self._adjust_worker_trust_locked(h_nid, alpha_delta=1.5)
                                if h_nid == node_id:
                                    w_upd = hw
                                    final_status = "VERIFIED"

                        if final_status == "QUARANTINED":
                            self._conn.commit()
                            return SubmissionReceipt(
                                False,
                                task_id,
                                "QUARANTINED",
                                f"CANARY_DIVERGENCE:{parity_reason}",
                                s_rec.fencing_token,
                                0.0,
                                w_upd.trust_score,
                                tuple(quarantined_nodes),
                            )

            self._conn.commit()
            return SubmissionReceipt(
                True,
                task_id,
                final_status,
                "ok",
                s_rec.fencing_token,
                prelim_weight,
                w_upd.trust_score,
                tuple(quarantined_nodes),
            )

    def collect_verified_results(self, campaign_id: str | None = None) -> list[dict[str, Any]]:
        """Collect weighted, verified microtask payloads ready for critic aggregation."""
        with self._lock:
            if campaign_id:
                rows = self._conn.execute(
                    """
                    SELECT * FROM gse_microtask_slices
                    WHERE status = 'VERIFIED' AND campaign_id = ? AND result_json IS NOT NULL
                    ORDER BY task_id ASC
                    """,
                    (campaign_id,),
                ).fetchall()
            else:
                rows = self._conn.execute(
                    """
                    SELECT * FROM gse_microtask_slices
                    WHERE status = 'VERIFIED' AND result_json IS NOT NULL
                    ORDER BY task_id ASC
                    """
                ).fetchall()
            out: list[dict[str, Any]] = []
            for r in rows:
                out.append(
                    {
                        "task_id": str(r["task_id"]),
                        "campaign_id": str(r["campaign_id"]),
                        "island_id": str(r["island_id"]),
                        "task_type": str(r["task_type"]),
                        "result_weight": float(r["result_weight"]),
                        "result": json.loads(str(r["result_json"])),
                    }
                )
            return out
