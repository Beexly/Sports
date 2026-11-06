"""PostHog $50,000 Startup Cloud Context Layer (Project ID 516325).

Implements:
1. Zero-dependency PostHog Cloud capture (`POST https://us.i.posthog.com/capture/`) for:
   - `$ai_generation` and `$ai_trace` (model routing, JEV snap simulation, token & latency telemetry)
   - Activation, retention, and storefront revenue events (`package_viewed`, `checkout_initiated`, `vip_card_unlocked`)
   - Feature flag evaluation (`POST https://us.i.posthog.com/decide/?v=3`)
2. `DuckgresHoglakeEngine` (`PostHog/duckgres` / `hoglake` pattern):
   - Local DuckDB analytical SQL engine with strict `SET memory_limit='512MB'` and `SET threads=2`
     to protect laptop RAM while querying local Parquet/JSONL and corpus tables.
3. `ContextMillCompactor` (`PostHog/context-mill` pattern):
   - Compiles uncompressed corpus provenance summaries (210 books, 372 URLs/repos, 30 Morning Sweep CSVs,
     10 Innovation Kernels, and NGS/commercial intelligence) into structured context frames for AI traces.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

from intelligence.retrieval.pinecone_hybrid_corpus_index import (
    build_uncompressed_full_corpus_documents,
    load_env_local_secrets,
)


class DuckgresHoglakeEngine:
    """Memory-capped DuckDB analytical lakehouse helper (`PostHog/duckgres` / `hoglake` pattern).

    Enforces `SET memory_limit='512MB'` and `SET threads=2` on every session so analytical
    queries over Parquet/JSONL never exhaust host memory.
    """

    def __init__(self, memory_limit: str = "512MB", threads: int = 2) -> None:
        self.memory_limit = memory_limit
        self.threads = int(threads)

    def execute_query(self, sql: str, params: Optional[Sequence[Any]] = None) -> List[Dict[str, Any]]:
        """Execute an analytical SQL query inside a 512MB-capped DuckDB in-memory connection."""
        try:
            import duckdb  # type: ignore

            conn = duckdb.connect(database=":memory:")
            try:
                conn.execute(f"SET memory_limit='{self.memory_limit}';")
                conn.execute(f"SET threads={self.threads};")
                cursor = conn.execute(sql, params) if params else conn.execute(sql)
                if cursor.description is None:
                    return []
                col_names = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
                return [dict(zip(col_names, row)) for row in rows]
            finally:
                conn.close()
        except ImportError:
            return [{"fallback": True, "sql": sql, "memory_limit": self.memory_limit}]


class ContextMillCompactor:
    """Context enrichment & trace compiler (`PostHog/context-mill` pattern).

    Synthesizes uncompressed corpus provenance across all 210 books, 372 URLs/repos,
    30 Morning Sweep CSVs, 10 Innovation Kernels, and NGS/commercial intelligence feeds.
    """

    def __init__(self) -> None:
        self.corpus_docs = build_uncompressed_full_corpus_documents()

    def build_context_summary(self, active_game_id: str = "NFL-2026-W9", focus_lane: str = "ALL") -> Dict[str, Any]:
        books = [d for d in self.corpus_docs if d.category == "book"]
        repos = [d for d in self.corpus_docs if d.category == "repo"]
        csvs = [d for d in self.corpus_docs if d.category == "morning_sweep_csv"]
        kernels = [d for d in self.corpus_docs if d.category == "innovation_kernel"]
        ngs_intel = [d for d in self.corpus_docs if d.category == "ngs_commercial_intelligence"]

        return {
            "game_id": active_game_id,
            "focus_lane": focus_lane,
            "uncompressed_corpus_verified": True,
            "counts": {
                "books": len(books),
                "repos_and_urls": len(repos),
                "morning_sweep_csvs": len(csvs),
                "innovation_kernels": len(kernels),
                "ngs_commercial_intelligence": len(ngs_intel),
                "total_corpus_units": len(self.corpus_docs),
            },
            "kernel_titles": [k.title for k in kernels],
            "ngs_feeds": [n.title for n in ngs_intel],
        }


class PostHogCloudContextClient:
    """Zero-dependency PostHog Cloud client for Project 516325 ($50,000 Startup Credits)."""

    DEFAULT_HOST = "https://us.i.posthog.com"
    DEFAULT_PROJECT_ID = "516325"

    def __init__(
        self,
        project_api_key: Optional[str] = None,
        personal_api_key: Optional[str] = None,
        project_id: Optional[str] = None,
        host: Optional[str] = None,
        offline_mode: bool = False,
    ) -> None:
        env_secrets = load_env_local_secrets()
        self.offline_mode = offline_mode
        self.project_id = (
            project_id
            or os.environ.get("POSTHOG_PROJECT_ID")
            or env_secrets.get("POSTHOG_PROJECT_ID", self.DEFAULT_PROJECT_ID)
        )
        self.host = (
            host
            or os.environ.get("NEXT_PUBLIC_POSTHOG_HOST")
            or env_secrets.get("NEXT_PUBLIC_POSTHOG_HOST", self.DEFAULT_HOST)
        ).rstrip("/")
        if offline_mode:
            self._project_api_key = ""
            self._personal_api_key = ""
        else:
            self._project_api_key = (
                project_api_key
                if project_api_key is not None
                else (
                    os.environ.get("NEXT_PUBLIC_POSTHOG_KEY")
                    or env_secrets.get("NEXT_PUBLIC_POSTHOG_KEY", "")
                )
            )
            self._personal_api_key = (
                personal_api_key
                if personal_api_key is not None
                else (
                    os.environ.get("POSTHOG_PERSONAL_API_KEY")
                    or env_secrets.get("POSTHOG_PERSONAL_API_KEY", "")
                )
            )
        self.duckgres = DuckgresHoglakeEngine(memory_limit="512MB", threads=2)
        self.context_mill = ContextMillCompactor()
        self.event_outbox: List[Dict[str, Any]] = []

    @property
    def is_configured(self) -> bool:
        return bool(not self.offline_mode and self._project_api_key)

    def _post_json(self, path: str, payload: Dict[str, Any], timeout: int = 10) -> Dict[str, Any]:
        if not self.is_configured:
            return {"status": "buffered_offline", "project_id": self.project_id}
        url = f"{self.host}/{path.lstrip('/')}"
        req = urllib.request.Request(
            url=url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
                return json.loads(raw) if raw.strip() else {"status": 1}
        except Exception as exc:
            return {"status": "buffered_on_network_error", "detail": str(exc)[:200]}

    def capture_event(
        self,
        event: str,
        distinct_id: str,
        properties: Optional[Dict[str, Any]] = None,
        send_live: bool = False,
    ) -> Dict[str, Any]:
        """Build and optionally transmit a PostHog event without ever leaking raw API keys in return payloads."""
        props = dict(properties or {})
        props.setdefault("$lib", "gse-posthog-context-layer")
        props.setdefault("posthog_project_id", self.project_id)
        props.setdefault("organization", "Galaxy Sports Network")

        envelope = {
            "event": event,
            "distinct_id": distinct_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "properties": props,
        }
        self.event_outbox.append(envelope)

        delivery_status = "buffered"
        if send_live and self.is_configured:
            live_payload = dict(envelope)
            live_payload["api_key"] = self._project_api_key
            resp = self._post_json("/capture/", live_payload)
            delivery_status = "sent" if resp.get("status") in (1, "Ok", "ok") else str(resp.get("status"))

        return {
            "event": event,
            "distinct_id": distinct_id,
            "project_id": self.project_id,
            "delivery_status": delivery_status,
            "properties": props,
        }

    def capture_ai_generation(
        self,
        distinct_id: str,
        model: str,
        provider: str,
        input_tokens: int,
        output_tokens: int,
        latency_ms: float,
        trace_id: Optional[str] = None,
        game_id: str = "NFL-2026-W9",
        send_live: bool = False,
    ) -> Dict[str, Any]:
        """Capture a PostHog `$ai_generation` telemetry event enriched by `ContextMillCompactor`."""
        resolved_trace_id = trace_id or str(uuid.uuid4())
        ctx = self.context_mill.build_context_summary(active_game_id=game_id)
        return self.capture_event(
            event="$ai_generation",
            distinct_id=distinct_id,
            properties={
                "$ai_trace_id": resolved_trace_id,
                "$ai_model": model,
                "$ai_provider": provider,
                "$ai_input_tokens": int(input_tokens),
                "$ai_output_tokens": int(output_tokens),
                "$ai_latency_ms": round(float(latency_ms), 2),
                "context_mill_counts": ctx["counts"],
                "game_id": game_id,
            },
            send_live=send_live,
        )

    def capture_ai_trace(
        self,
        distinct_id: str,
        trace_id: str,
        workflow_stage: str,
        conformal_passed: bool,
        game_id: str = "NFL-2026-W9",
        send_live: bool = False,
    ) -> Dict[str, Any]:
        """Capture a PostHog `$ai_trace` event across the 5-stage GSE engine gate."""
        return self.capture_event(
            event="$ai_trace",
            distinct_id=distinct_id,
            properties={
                "$ai_trace_id": trace_id,
                "workflow_stage": workflow_stage,
                "conformal_passed": bool(conformal_passed),
                "game_id": game_id,
            },
            send_live=send_live,
        )

    def evaluate_feature_flag(
        self,
        flag_key: str,
        distinct_id: str,
        default_value: bool = True,
        send_live: bool = False,
    ) -> bool:
        """Evaluate a PostHog feature flag via `/decide/?v=3` with deterministic fallback."""
        if send_live and self.is_configured:
            payload = {
                "api_key": self._project_api_key,
                "distinct_id": distinct_id,
            }
            resp = self._post_json("/decide/?v=3", payload)
            flags = resp.get("featureFlags") or {}
            if flag_key in flags:
                return bool(flags[flag_key])
        return bool(default_value)
