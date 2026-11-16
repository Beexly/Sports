"""Workflow determinism and LIFO Saga compensation tests for SlateWindowWorkflow."""

from __future__ import annotations

import asyncio

from gse_engine.models import SlateWindowConfig
from gse_engine.workflows.slate_window import SlateLockDependencies, SlateWindowWorkflow


def test_slate_window_workflow_happy_path() -> None:
    """Verifies ordered lock execution across Stage 0, CAGE, R2, Neon, and ContentOS."""

    async def _run() -> None:
        events: list[str] = []

        async def verify_stage0(_: SlateWindowConfig) -> str:
            events.append("stage0")
            return "sha_stage0"

        async def run_cage(_: SlateWindowConfig, __: str) -> str:
            events.append("cage")
            return "sha_cage"

        async def archive_r2(_: SlateWindowConfig, __: str) -> str:
            events.append("r2_put")
            return "receipts/2026_w10.json"

        async def delete_r2(key: str) -> None:
            events.append(f"r2_del:{key}")

        async def persist_neon(_: SlateWindowConfig, __: str, ___: str) -> str:
            events.append("neon_put")
            return "pkt_1"

        async def unpublish_neon(pkt_id: str) -> None:
            events.append(f"neon_del:{pkt_id}")

        async def emit_content(_: SlateWindowConfig, __: str) -> int:
            events.append("content")
            return 6

        deps = SlateLockDependencies(
            verify_stage0_and_feeds=verify_stage0,
            run_engine_and_cage_gate=run_cage,
            archive_r2_receipt=archive_r2,
            delete_r2_receipt=delete_r2,
            persist_neon_slate_packet=persist_neon,
            unpublish_neon_slate_packet=unpublish_neon,
            emit_content_os_drafts=emit_content,
        )
        cfg = SlateWindowConfig(season=2026, week=10, window_slot="SUN_EARLY", mode="noon-lock")
        result = await SlateWindowWorkflow().run(cfg, deps)

        assert result.ok is True
        assert result.lock_version == "v3.0"
        assert result.content_draft_count == 6
        assert result.compensated_steps == ()
        assert events == ["stage0", "cage", "r2_put", "neon_put", "content"]

    asyncio.run(_run())


def test_slate_window_workflow_runs_lifo_saga_rollback_on_downstream_failure() -> None:
    """Failure after Neon write must roll back Neon packet BEFORE R2 receipt in LIFO order."""

    async def _run() -> None:
        rollback_order: list[str] = []

        async def verify_stage0(_: SlateWindowConfig) -> str:
            return "sha_stage0"

        async def run_cage(_: SlateWindowConfig, __: str) -> str:
            return "sha_cage"

        async def archive_r2(_: SlateWindowConfig, __: str) -> str:
            return "receipts/2026_w10_mnf.json"

        async def delete_r2(key: str) -> None:
            rollback_order.append(f"delete_r2:{key}")

        async def persist_neon(_: SlateWindowConfig, __: str, ___: str) -> str:
            return "pkt_mnf"

        async def unpublish_neon(pkt_id: str) -> None:
            rollback_order.append(f"unpublish_neon:{pkt_id}")

        async def fail_content(_: SlateWindowConfig, __: str) -> int:
            raise RuntimeError("content-os-unavailable")

        deps = SlateLockDependencies(
            verify_stage0_and_feeds=verify_stage0,
            run_engine_and_cage_gate=run_cage,
            archive_r2_receipt=archive_r2,
            delete_r2_receipt=delete_r2,
            persist_neon_slate_packet=persist_neon,
            unpublish_neon_slate_packet=unpublish_neon,
            emit_content_os_drafts=fail_content,
        )
        cfg = SlateWindowConfig(season=2026, week=10, window_slot="MNF", mode="noon-lock")
        result = await SlateWindowWorkflow().run(cfg, deps)

        assert result.ok is False
        assert result.lock_version == "v3.5"
        assert result.compensated_steps == ("unpublish_neon_slate_packet", "delete_r2_receipt")
        assert rollback_order == [
            "unpublish_neon:pkt_mnf",
            "delete_r2:receipts/2026_w10_mnf.json",
        ]

    asyncio.run(_run())
