"""Durable Three-Noon Master Lock + T-90m Adjustment workflow with LIFO Saga rollback."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field

from gse_engine.compute.market_surface_and_filtration import (
    NonCommutativeFiltrationResult,
    evaluate_non_commutative_filtration_bridge,
)
from gse_engine.models import SlateWindowConfig

try:
    from temporalio import workflow as _temporal_workflow  # type: ignore[import-not-found]
except ImportError:
    _temporal_workflow = None


def _workflow_defn(cls: type) -> type:
    """Applies @temporalio.workflow.defn when temporalio is installed."""
    if _temporal_workflow is not None:
        return _temporal_workflow.defn(cls)  # type: ignore[no-any-return]
    return cls


def _workflow_run(
    fn: Callable[..., Awaitable[SlateLockResult]],
) -> Callable[..., Awaitable[SlateLockResult]]:
    """Applies @temporalio.workflow.run when temporalio is installed."""
    if _temporal_workflow is not None:
        return _temporal_workflow.run(fn)  # type: ignore[no-any-return]
    return fn


@dataclass(frozen=True, slots=True)
class SlateLockDependencies:
    """Injectable async activity seams matching Temporal activity determinism."""

    verify_stage0_and_feeds: Callable[[SlateWindowConfig], Awaitable[str]]
    run_engine_and_cage_gate: Callable[[SlateWindowConfig, str], Awaitable[str]]
    archive_r2_receipt: Callable[[SlateWindowConfig, str], Awaitable[str]]
    delete_r2_receipt: Callable[[str], Awaitable[None]]
    persist_neon_slate_packet: Callable[[SlateWindowConfig, str, str], Awaitable[str]]
    unpublish_neon_slate_packet: Callable[[str], Awaitable[None]]
    emit_content_os_drafts: Callable[[SlateWindowConfig, str], Awaitable[int]]


@dataclass(frozen=True, slots=True)
class SlateLockResult:
    """Outcome summary emitted by SlateWindowWorkflow."""

    ok: bool
    lock_version: str
    stage0_digest: str
    cage_sha256: str | None
    r2_key: str | None
    neon_packet_id: str | None
    content_draft_count: int
    compensated_steps: tuple[str, ...] = field(default_factory=tuple)
    error: str | None = None


def resolve_lock_version(cfg: SlateWindowConfig) -> str:
    """Maps canonical slate window + mode to ADR-0010 lock version."""
    if cfg.mode == "noon-lock":
        if cfg.window_slot == "TNF":
            return "v2.0"
        if cfg.window_slot == "MNF":
            return "v3.5"
        return "v3.0"
    return "v2.5" if cfg.window_slot == "TNF" else "v4.0"


def compute_t90m_filtration_delta(
    *,
    eta_noon: float,
    delta_line_sharp: float,
    delta_inj_causal: float,
    t_steam_utc: int,
    t_inact_utc: int,
    dt_exec_min: float = 0.0,
) -> NonCommutativeFiltrationResult:
    """Delegate T-90m martingale update to K20 non-commutative [U_inj, U_steam] filtration."""
    return evaluate_non_commutative_filtration_bridge(
        eta_noon=eta_noon,
        delta_line_sharp=delta_line_sharp,
        delta_inj_causal=delta_inj_causal,
        t_steam_utc=t_steam_utc,
        t_inact_utc=t_inact_utc,
        dt_exec_min=dt_exec_min,
    )


@_workflow_defn
class SlateWindowWorkflow:
    """Executes one Noon Master Lock or T-90m delta with LIFO Saga rollback."""

    @_workflow_run
    async def run(
        self,
        cfg: SlateWindowConfig,
        deps: SlateLockDependencies,
    ) -> SlateLockResult:
        """Runs the ordered lock pipeline with LIFO compensation on failure."""
        lock_version = resolve_lock_version(cfg)
        compensations: list[tuple[str, Callable[[], Awaitable[None]]]] = []
        stage0_digest = ""
        cage_sha256: str | None = None
        r2_key: str | None = None
        neon_packet_id: str | None = None

        try:
            stage0_digest = await deps.verify_stage0_and_feeds(cfg)
            cage_sha256 = await deps.run_engine_and_cage_gate(cfg, stage0_digest)

            r2_key = await deps.archive_r2_receipt(cfg, cage_sha256)
            captured_r2 = r2_key
            compensations.append(("delete_r2_receipt", lambda: deps.delete_r2_receipt(captured_r2)))

            neon_packet_id = await deps.persist_neon_slate_packet(cfg, cage_sha256, r2_key)
            captured_pkt = neon_packet_id
            compensations.append(
                (
                    "unpublish_neon_slate_packet",
                    lambda: deps.unpublish_neon_slate_packet(captured_pkt),
                )
            )

            drafts = await deps.emit_content_os_drafts(cfg, neon_packet_id)
            return SlateLockResult(
                ok=True,
                lock_version=lock_version,
                stage0_digest=stage0_digest,
                cage_sha256=cage_sha256,
                r2_key=r2_key,
                neon_packet_id=neon_packet_id,
                content_draft_count=drafts,
            )
        except Exception as exc:
            ran_comp: list[str] = []
            for label, comp_fn in reversed(compensations):
                await comp_fn()
                ran_comp.append(label)
            return SlateLockResult(
                ok=False,
                lock_version=lock_version,
                stage0_digest=stage0_digest,
                cage_sha256=cage_sha256,
                r2_key=r2_key,
                neon_packet_id=neon_packet_id,
                content_draft_count=0,
                compensated_steps=tuple(ran_comp),
                error=str(exc),
            )
