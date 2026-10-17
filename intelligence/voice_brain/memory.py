"""Episodic and Semantic Memory Engine for Sovereign GSE Brain.

Maintains persistent long-term knowledge across sessions so Garrett never has
to re-explain context, rules, fleet architecture, or budget constraints.
Uses SQLite with WAL mode and Full-Text Search.
"""

from __future__ import annotations

import datetime
import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path(__file__).parent / "memory.db"


class BrainMemory:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self._init_db()
        self._seed_foundational_facts()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    metadata_json TEXT DEFAULT '{}'
                );

                CREATE TABLE IF NOT EXISTS turns (
                    turn_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL, -- 'user', 'assistant', 'system'
                    content TEXT NOT NULL,
                    model_used TEXT,
                    cost_cents REAL DEFAULT 0.0,
                    latency_ms INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS facts (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    domain TEXT NOT NULL, -- 'doctrine', 'fleet', 'budget', 'sports', 'credentials'
                    source TEXT NOT NULL,
                    confidence REAL DEFAULT 1.0,
                    updated_at TEXT NOT NULL
                );

                CREATE VIRTUAL TABLE IF NOT EXISTS facts_fts USING fts5(
                    key, value, domain, content=facts, content_rowid=rowid
                );

                -- Trigger to keep FTS in sync
                CREATE TRIGGER IF NOT EXISTS facts_ai AFTER INSERT ON facts BEGIN
                    INSERT INTO facts_fts(rowid, key, value, domain) VALUES (new.rowid, new.key, new.value, new.domain);
                END;
                CREATE TRIGGER IF NOT EXISTS facts_ad AFTER DELETE ON facts BEGIN
                    INSERT INTO facts_fts(facts_fts, rowid, key, value, domain) VALUES('delete', old.rowid, old.key, old.value, old.domain);
                END;
                CREATE TRIGGER IF NOT EXISTS facts_au AFTER UPDATE ON facts BEGIN
                    INSERT INTO facts_fts(facts_fts, rowid, key, value, domain) VALUES('delete', old.rowid, old.key, old.value, old.domain);
                    INSERT INTO facts_fts(rowid, key, value, domain) VALUES (new.rowid, new.key, new.value, new.domain);
                END;
                """
            )

    def _seed_foundational_facts(self) -> None:
        """Seed core immutable doctrines and operational reality."""
        foundational = [
            (
                "user_identity",
                "Garrett Baxley (baxley.garrett@gmail.com). Founder & Lead Strategist of Galaxy Sports Edge (GSE) and Beexly.",
                "identity",
            ),
            (
                "budget_constraint",
                "$20/mo Claude subscription limit. Zero tolerance for wasteful metered API spend. Maximize Google AI Studio free/expanded limits, Colab GPU (200 units), OpenRouter micro-routing (GLM/DeepSeek Flash), and local tools (Hermes, MiMo).",
                "budget",
            ),
            (
                "doctrine_direct_to_mind",
                "Nothing stays local, ever. Every result lands same-day on remote branch or agent bus. Mind feeds go trainer-ready to brain/feeds/. Engine work lands as code on Beexly/Sports.",
                "doctrine",
            ),
            (
                "doctrine_wire_first",
                "Sequencing: research -> wire -> weight -> calibrate -> test -> polish. Scoring calibration on old models is rejected as progress measure.",
                "doctrine",
            ),
            (
                "doctrine_reasoning",
                "Closing line is sharpest number on earth. Edge comes from: (1) situations models miss (1-3 pts/spot), (2) timing/news before move (1-2% CLV), (3) SGP correlation mispricing, (4) deep coverage, (5) pass discipline. Output = base market line + hyper-intelligent reasoning overlay.",
                "doctrine",
            ),
            (
                "agent_fleet_architecture",
                "Agent bus at C:\\Users\\Garrett\\orca\\agent-bus\\agent-bus. Motif is lead strategist (Muse), Orca is hands/builder, Hermes is player/executor, OpenCode CLI has elite models.",
                "fleet",
            ),
            (
                "cloud_infrastructure",
                "Neon Serverless Postgres & S3 (AWS_ENDPOINT_URL_S3) & AI Gateway. Alibaba Cloud Bailian (via ALIBABA_API_KEY env) for Qwen 2.5 72B.",
                "credentials",
            ),
            (
                "prediction_engine_status",
                "v4.14 / v5.3.0. 8 rating systems (Colley, Massey, SRS, PageRank, Keener, Glicko-2, TrueSkill, Plackett-Luce). Conformal 90.8% coverage. NFL 2025 backtest Brier 0.2464 via T=7.512 refit.",
                "sports",
            ),
        ]
        for key, val, domain in foundational:
            self.upsert_fact(key, val, domain, source="foundational_seed", overwrite_if_exists=False)

    def upsert_fact(
        self,
        key: str,
        value: str,
        domain: str = "general",
        source: str = "user",
        confidence: float = 1.0,
        overwrite_if_exists: bool = True,
    ) -> None:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self._get_connection() as conn:
            if not overwrite_if_exists:
                cur = conn.execute("SELECT key FROM facts WHERE key = ?", (key,))
                if cur.fetchone():
                    return
            conn.execute(
                """
                INSERT INTO facts (key, value, domain, source, confidence, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    domain = excluded.domain,
                    source = excluded.source,
                    confidence = excluded.confidence,
                    updated_at = excluded.updated_at
                """,
                (key, value, domain, source, confidence, now),
            )

    def get_fact(self, key: str) -> Optional[str]:
        with self._get_connection() as conn:
            cur = conn.execute("SELECT value FROM facts WHERE key = ?", (key,))
            row = cur.fetchone()
            return row["value"] if row else None

    def search_facts(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            try:
                cur = conn.execute(
                    """
                    SELECT f.key, f.value, f.domain, f.source, f.confidence, f.updated_at
                    FROM facts f
                    JOIN facts_fts ON f.rowid = facts_fts.rowid
                    WHERE facts_fts MATCH ?
                    ORDER BY rank
                    LIMIT ?
                    """,
                    (query, limit),
                )
                return [dict(r) for r in cur.fetchall()]
            except sqlite3.OperationalError:
                # Fallback to LIKE if FTS expression has syntax quirks
                cur = conn.execute(
                    """
                    SELECT key, value, domain, source, confidence, updated_at
                    FROM facts
                    WHERE key LIKE ? OR value LIKE ?
                    LIMIT ?
                    """,
                    (f"%{query}%", f"%{query}%", limit),
                )
                return [dict(r) for r in cur.fetchall()]

    def get_all_facts(self, domain: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            if domain:
                cur = conn.execute("SELECT * FROM facts WHERE domain = ? ORDER BY key", (domain,))
            else:
                cur = conn.execute("SELECT * FROM facts ORDER BY domain, key")
            return [dict(r) for r in cur.fetchall()]

    def record_turn(
        self,
        session_id: str,
        role: str,
        content: str,
        model_used: Optional[str] = None,
        cost_cents: float = 0.0,
        latency_ms: int = 0,
    ) -> None:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO sessions (session_id, title, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET updated_at = excluded.updated_at
                """,
                (session_id, session_id, now, now),
            )
            conn.execute(
                """
                INSERT INTO turns (session_id, role, content, model_used, cost_cents, latency_ms, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (session_id, role, content, model_used, cost_cents, latency_ms, now),
            )

    def get_recent_history(self, session_id: str, limit: int = 10) -> List[Dict[str, str]]:
        with self._get_connection() as conn:
            cur = conn.execute(
                """
                SELECT role, content FROM turns
                WHERE session_id = ?
                ORDER BY turn_id DESC
                LIMIT ?
                """,
                (session_id, limit),
            )
            rows = [dict(r) for r in cur.fetchall()]
            return list(reversed(rows))
